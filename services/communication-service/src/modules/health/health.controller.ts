import {
  Controller, Get, HttpCode, HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService }       from '@nestjs/config';
import { InjectQueue }         from '@nestjs/bull';
import Redis                   from 'ioredis';
import { NodemailerProvider }  from '../email/providers/nodemailer.provider';
import { QueueMetricsService } from './queue-metrics.service';

/** Minimal Queue interface for health check. */
interface BullQueueHealth {
  getJobCounts(): Promise<Record<string, number>>;
  isReady():      Promise<unknown>;
}

type CheckStatus = 'up' | 'down';

interface ComponentHealth {
  status:  CheckStatus;
  message?: string;
  latencyMs?: number;
}

export interface HealthResponse {
  status:  'ok' | 'degraded' | 'down';
  checks: {
    redis:  ComponentHealth;
    queue:  ComponentHealth;
    smtp:   ComponentHealth;
  };
  metrics?: Awaited<ReturnType<QueueMetricsService['getMetrics']>>;
  timestamp: string;
  uptime:    number;
}

/**
 * HealthController
 *
 * Route prefix: /health  (no global API prefix — intentional, healthchecks
 * must be reachable without versioning or auth guards)
 *
 * GET /health       — deep health: Redis + BullMQ + SMTP + metrics
 *                     Returns 200 when all up; 503 when any critical check fails.
 *                     SMTP failure is non-critical (returns 200 with degraded status).
 *
 * GET /health/ready — liveness/readiness: Redis + BullMQ only (fast, no SMTP).
 *                     Returns 200 ready | 503 not ready.
 *                     Used by container orchestrators (Kubernetes readiness probe).
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly config:          ConfigService,
    private readonly smtpProvider:    NodemailerProvider,
    private readonly metricsService:  QueueMetricsService,
    @InjectQueue('email') private readonly emailQueue: BullQueueHealth,
  ) {}

  // ── Deep health ───────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async health(): Promise<HealthResponse> {
    const [redis, queue, smtp, metrics] = await Promise.all([
      this.checkRedis(),
      this.checkQueue(),
      this.checkSmtp(),
      this.metricsService.getMetrics().catch(() => undefined),
    ]);

    const criticalDown = redis.status === 'down' || queue.status === 'down';
    const overallStatus = criticalDown
      ? 'down'
      : smtp.status === 'down' ? 'degraded' : 'ok';

    const response: HealthResponse = {
      status:    overallStatus,
      checks:    { redis, queue, smtp },
      metrics,
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
    };

    if (criticalDown) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  // ── Readiness probe ───────────────────────────────────────────────────────

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<{ status: 'ready' | 'not_ready'; checks: Record<string, ComponentHealth> }> {
    const [redis, queue] = await Promise.all([
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const ready = redis.status === 'up' && queue.status === 'up';

    const response = {
      status:  (ready ? 'ready' : 'not_ready') as 'ready' | 'not_ready',
      checks:  { redis, queue },
    };

    if (!ready) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  // ── Component checks ──────────────────────────────────────────────────────

  private async checkRedis(): Promise<ComponentHealth> {
    const url   = this.config.get<string>('REDIS_URL');
    const start = Date.now();

    if (!url) {
      return { status: 'down', message: 'REDIS_URL not configured' };
    }

    const client = new Redis(url, {
      lazyConnect:          true,
      enableOfflineQueue:   false,
      connectTimeout:       3_000,
      maxRetriesPerRequest: 0,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      const latencyMs = Date.now() - start;
      return pong === 'PONG'
        ? { status: 'up', latencyMs }
        : { status: 'down', message: `Unexpected PING response: ${pong}` };
    } catch (err: unknown) {
      return {
        status:  'down',
        message: err instanceof Error ? err.message : 'Redis unreachable',
      };
    } finally {
      await client.quit().catch(() => undefined);
    }
  }

  private async checkQueue(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.emailQueue.isReady();
      const counts    = await this.emailQueue.getJobCounts();
      const latencyMs = Date.now() - start;
      return {
        status:  'up',
        latencyMs,
        message: `waiting=${counts['waiting'] ?? 0} active=${counts['active'] ?? 0} failed=${counts['failed'] ?? 0}`,
      };
    } catch (err: unknown) {
      return {
        status:  'down',
        message: err instanceof Error ? err.message : 'Queue unavailable',
      };
    }
  }

  private async checkSmtp(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      // NodemailerProvider.verify() calls transporter.verify() — returns true or throws
      const ok = await this.smtpProvider.verify();
      const latencyMs = Date.now() - start;
      return ok
        ? { status: 'up', latencyMs }
        : { status: 'down', message: 'SMTP not configured' };
    } catch (err: unknown) {
      return {
        status:  'down',
        message: err instanceof Error ? err.message : 'SMTP unreachable',
      };
    }
  }
}

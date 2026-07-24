import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueueMetricsService } from '../health/queue-metrics.service';

/**
 * MetricsController
 *
 * GET /metrics/queue — returns queue delivery metrics.
 * Not tenant-scoped — service-level metrics, typically accessed
 * by internal monitoring (Prometheus scraper, Grafana agent, etc.).
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: QueueMetricsService) {}

  @Get('queue')
  @HttpCode(HttpStatus.OK)
  queueMetrics() {
    return this.metrics.getMetrics();
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService }        from '@nestjs/config';
import { DataSource }           from 'typeorm';
import { InjectDataSource }     from '@nestjs/typeorm';
import * as crypto              from 'node:crypto';
import { WebhookEventEntity }   from '../entities/webhook-event.entity';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

/**
 * WebhookHandlerService
 *
 * Centralised webhook processing for all payment gateways.
 *
 * Responsibilities:
 *   1. Signature verification (HMAC) per provider.
 *   2. Idempotency dedup via WebhookEventEntity unique constraint.
 *   3. Event routing to PaymentOrchestratorService.
 *   4. Audit persistence (WebhookEventEntity).
 *
 * Security design:
 *   - Signature is verified BEFORE the payload is parsed or processed.
 *   - Invalid signatures return 400 with no internal detail.
 *   - Duplicate event IDs return 200 (idempotent — gateway may retry).
 *   - rawPayload stored verbatim for audit/replay.
 *
 * Supported events:
 *   Stripe:
 *     payment_intent.succeeded      → handlePaymentSuccess
 *     payment_intent.payment_failed → handlePaymentFailure
 *   Razorpay:
 *     payment.captured              → handlePaymentSuccess
 *     payment.failed                → handlePaymentFailure
 *
 * Environment variables:
 *   STRIPE_WEBHOOK_SECRET     — Stripe webhook signing secret (whsec_...)
 *   RAZORPAY_WEBHOOK_SECRET   — Razorpay webhook secret
 *   WEBHOOK_SYSTEM_ACTOR_ID   — Actor ID recorded in audit log
 */
@Injectable()
export class WebhookHandlerService {
  private readonly logger = new Logger(WebhookHandlerService.name);

  constructor(
    private readonly config:       ConfigService,
    private readonly orchestrator: PaymentOrchestratorService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ── Public entry point ────────────────────────────────────────────────────

  /**
   * handle() — called by WebhookController for every inbound webhook.
   *
   * @param provider    gateway name from URL path (/webhooks/:provider)
   * @param tenantId    tenant from x-tenant-id header
   * @param rawBody     raw request body Buffer (required for HMAC verification)
   * @param signature   value of Stripe-Signature or X-Razorpay-Signature header
   * @param payload     parsed JSON body
   * @param sourceIp    caller IP for audit
   */
  async handle(params: {
    provider:   string;
    tenantId:   string;
    rawBody:    Buffer;
    signature:  string | undefined;
    payload:    Record<string, unknown>;
    sourceIp?:  string;
  }): Promise<{ status: 'processed' | 'ignored' | 'duplicate' }> {

    const { provider, tenantId, rawBody, signature, payload, sourceIp } = params;

    // ── 1. Signature verification (before any DB writes) ──────────────────
    this.verifySignature(provider, rawBody, signature);

    // ── 2. Extract provider event ID ──────────────────────────────────────
    const { eventId, eventType } = this.extractEventMeta(provider, payload);

    // ── 3. Idempotency gate — INSERT or CONFLICT ──────────────────────────
    let webhookEntity: WebhookEventEntity;
    try {
      const repo = this.ds.getRepository(WebhookEventEntity);
      webhookEntity = repo.create({
        tenantId,
        provider,
        providerEventId: eventId,
        eventType,
        rawPayload:      payload,
        signatureHeader: signature ?? null,
        status:          'processing',
        sourceIp:        sourceIp ?? null,
      });
      await repo.save(webhookEntity);
    } catch (err: unknown) {
      // Unique constraint violation = duplicate event
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        this.logger.warn(`Duplicate webhook ignored — provider=${provider} eventId=${eventId}`);
        return { status: 'duplicate' };
      }
      throw err;
    }

    // ── 4. Route to handler ────────────────────────────────────────────────
    const actorId = this.config.get<string>('WEBHOOK_SYSTEM_ACTOR_ID', 'system:webhook');
    let linkedPaymentId: string | null = null;

    try {
      const result = await this.route(provider, eventType, payload, tenantId, actorId);
      linkedPaymentId = result.financePaymentId ?? null;

      // Update status → processed
      await this.ds.getRepository(WebhookEventEntity).update(webhookEntity.id, {
        status:          'processed',
        linkedPaymentId,
        processedAt:     new Date(),
      });

      return { status: 'processed' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook processing failed — ${provider} ${eventType}: ${msg}`);

      await this.ds.getRepository(WebhookEventEntity).update(webhookEntity.id, {
        status:       'failed',
        errorMessage: msg.slice(0, 2000),
        processedAt:  new Date(),
      });

      // Re-throw so the gateway receives a 5xx and retries
      throw err;
    }
  }

  // ── Signature verification ────────────────────────────────────────────────

  private verifySignature(
    provider:   string,
    rawBody:    Buffer,
    signature:  string | undefined,
  ): void {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature header');
    }

    switch (provider) {
      case 'stripe':
        this.verifyStripeSignature(rawBody, signature);
        break;
      case 'razorpay':
        this.verifyRazorpaySignature(rawBody, signature);
        break;
      default:
        throw new BadRequestException(`Unknown webhook provider: ${provider}`);
    }
  }

  /**
   * Stripe HMAC-SHA256 verification.
   * Stripe-Signature header format: t=<timestamp>,v1=<hmac>,...
   *
   * Replay attack protection: reject events where timestamp is > 5 min old.
   */
  private verifyStripeSignature(rawBody: Buffer, signatureHeader: string): void {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not set — cannot verify webhooks');
      throw new BadRequestException('Webhook configuration error');
    }

    const parts   = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.split('=')),
    ) as Record<string, string>;

    const timestamp = parseInt(parts['t'] ?? '0', 10);
    const v1sig     = parts['v1'];

    if (!v1sig) throw new BadRequestException('Invalid Stripe signature format');

    // Replay protection: 5-minute tolerance
    const toleranceMs = this.config.get<number>('WEBHOOK_TIMESTAMP_TOLERANCE_MS', 300_000);
    if (Math.abs(Date.now() - timestamp * 1000) > toleranceMs) {
      throw new BadRequestException('Stripe webhook timestamp too old');
    }

    const signed   = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1sig, 'hex'))) {
      this.logger.warn('Stripe webhook signature mismatch');
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Razorpay HMAC-SHA256 verification.
   * X-Razorpay-Signature header is hex(HMAC-SHA256(rawBody, secret)).
   */
  private verifyRazorpaySignature(rawBody: Buffer, signature: string): void {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not set');
      throw new BadRequestException('Webhook configuration error');
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
      this.logger.warn('Razorpay webhook signature mismatch');
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // ── Event meta extraction ─────────────────────────────────────────────────

  private extractEventMeta(
    provider: string,
    payload:  Record<string, unknown>,
  ): { eventId: string; eventType: string } {
    switch (provider) {
      case 'stripe': {
        const id   = payload['id']   as string | undefined;
        const type = payload['type'] as string | undefined;
        if (!id || !type) throw new BadRequestException('Invalid Stripe event payload');
        return { eventId: id, eventType: type };
      }
      case 'razorpay': {
        // Razorpay webhooks: { event, payload: { payment: { entity: { id } } } }
        const type      = payload['event'] as string | undefined;
        const rpPayload = payload['payload'] as Record<string, unknown> | undefined;
        const entity    = (rpPayload?.['payment'] as Record<string, unknown> | undefined)
          ?.['entity'] as Record<string, unknown> | undefined;
        const id = entity?.['id'] as string | undefined;
        if (!id || !type) throw new BadRequestException('Invalid Razorpay event payload');
        return { eventId: id, eventType: type };
      }
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }
  }

  // ── Event routing ─────────────────────────────────────────────────────────

  private async route(
    provider:  string,
    eventType: string,
    payload:   Record<string, unknown>,
    tenantId:  string,
    actorId:   string,
  ): Promise<{ financePaymentId?: string }> {

    switch (provider) {
      case 'stripe':
        return this.routeStripe(eventType, payload, tenantId, actorId);
      case 'razorpay':
        return this.routeRazorpay(eventType, payload, tenantId, actorId);
      default:
        this.logger.warn(`Ignoring event from unknown provider: ${provider}`);
        return {};
    }
  }

  private async routeStripe(
    eventType: string,
    payload:   Record<string, unknown>,
    tenantId:  string,
    actorId:   string,
  ): Promise<{ financePaymentId?: string }> {
    const data   = payload['data'] as Record<string, unknown>;
    const obj    = data?.['object'] as Record<string, unknown>;
    const piId   = obj?.['id'] as string | undefined;

    switch (eventType) {
      case 'payment_intent.succeeded': {
        if (!piId) throw new BadRequestException('Missing payment_intent id');
        const financePaymentId = await this.resolveFinancePaymentId(piId, tenantId);
        if (!financePaymentId) {
          this.logger.warn(`No finance payment found for gatewayPaymentId=${piId} — ignoring`);
          return {};
        }
        await this.orchestrator.handlePaymentSuccess({
          tenantId,
          financePaymentId,
          gatewayPaymentId: piId,
          capturedMinor:    (obj?.['amount_received'] as number | undefined) ?? 0,
          actorId,
        });
        return { financePaymentId };
      }

      case 'payment_intent.payment_failed': {
        if (!piId) throw new BadRequestException('Missing payment_intent id');
        const financePaymentId = await this.resolveFinancePaymentId(piId, tenantId);
        if (!financePaymentId) return {};
        const reason = (obj?.['last_payment_error'] as Record<string, string> | undefined)
          ?.['message'] ?? 'Payment failed';
        await this.orchestrator.handlePaymentFailure({ tenantId, financePaymentId, reason, actorId });
        return { financePaymentId };
      }

      default:
        this.logger.debug(`Stripe event ${eventType} not handled — ignoring`);
        return {};
    }
  }

  private async routeRazorpay(
    eventType: string,
    payload:   Record<string, unknown>,
    tenantId:  string,
    actorId:   string,
  ): Promise<{ financePaymentId?: string }> {
    const rpPayload = payload['payload'] as Record<string, unknown>;
    const entity    = (rpPayload?.['payment'] as Record<string, unknown>)
      ?.['entity'] as Record<string, unknown>;
    const paymentId = entity?.['id'] as string | undefined;

    switch (eventType) {
      case 'payment.captured': {
        if (!paymentId) throw new BadRequestException('Missing razorpay payment id');
        // Razorpay captures come with orderId — look up by gateway_payment_id = orderId
        const orderId = entity?.['order_id'] as string | undefined ?? paymentId;
        const financePaymentId = await this.resolveFinancePaymentId(orderId, tenantId);
        if (!financePaymentId) return {};
        await this.orchestrator.handlePaymentSuccess({
          tenantId,
          financePaymentId,
          gatewayPaymentId: orderId,
          capturedMinor:    (entity?.['amount'] as number | undefined) ?? 0,
          actorId,
        });
        return { financePaymentId };
      }

      case 'payment.failed': {
        if (!paymentId) throw new BadRequestException('Missing razorpay payment id');
        const orderId = entity?.['order_id'] as string | undefined ?? paymentId;
        const financePaymentId = await this.resolveFinancePaymentId(orderId, tenantId);
        if (!financePaymentId) return {};
        const reason = (entity?.['error_description'] as string | undefined) ?? 'Payment failed';
        await this.orchestrator.handlePaymentFailure({ tenantId, financePaymentId, reason, actorId });
        return { financePaymentId };
      }

      default:
        this.logger.debug(`Razorpay event ${eventType} not handled — ignoring`);
        return {};
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async resolveFinancePaymentId(
    gatewayPaymentId: string,
    tenantId:         string,
  ): Promise<string | undefined> {
    const rows = await this.ds.query<{ id: string }[]>(
      `SELECT id FROM finance_payments
       WHERE tenant_id = $1 AND gateway_payment_id = $2
       LIMIT 1`,
      [tenantId, gatewayPaymentId],
    );
    return rows[0]?.id;
  }
}

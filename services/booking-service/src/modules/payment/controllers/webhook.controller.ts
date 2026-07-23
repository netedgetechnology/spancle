import {
  BadRequestException,
  Controller, HttpCode, HttpStatus, Param, Post,
  Req, UseGuards,
} from '@nestjs/common';
import type { Request }          from 'express';
import { Public }                from '../../../common/decorators/roles.decorator';
import { TenantGuard }           from '../../booking/guards/booking.guard';
import { WebhookHandlerService } from '../services/webhook-handler.service';

/**
 * WebhookController
 *
 * Route prefix: /api/v1/webhooks
 *
 * Receives webhook payloads from payment gateways.
 * All routes are @Public() (no JWT required — gateway cannot send a JWT).
 * TenantGuard still runs — x-tenant-id header required from gateway configuration.
 *
 * Raw body access:
 *   NestJS strips the raw body during JSON parsing. To verify Stripe HMAC
 *   signatures we need the raw bytes. Configure the app to buffer raw bodies:
 *
 *   app.use('/api/v1/webhooks', rawBody());
 *   or use bodyParser.raw() for the webhook path in main.ts.
 *
 *   The raw body is accessible via req.rawBody (set by the raw-body middleware).
 *
 * Security:
 *   - WebhookHandlerService.handle() verifies HMAC signature FIRST.
 *   - Returns 200 immediately on duplicate (idempotent).
 *   - Returns 400 on invalid signature (no internal detail exposed).
 *   - Returns 500 on processing failure (triggers gateway retry).
 */
@Controller('webhooks')
@UseGuards(TenantGuard)
export class WebhookController {
  constructor(private readonly handler: WebhookHandlerService) {}

  /**
   * POST /api/v1/webhooks/:provider
   *
   * :provider = 'stripe' | 'razorpay'
   *
   * Signature header read from:
   *   Stripe:   Stripe-Signature
   *   Razorpay: X-Razorpay-Signature
   */
  @Post(':provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    // Fix 4: raw body is required for HMAC signature verification.
    // If req.rawBody is absent the raw-body middleware is not configured in
    // main.ts (PAY-1). Fail loudly rather than silently computing an incorrect
    // HMAC against re-serialised JSON.
    if (!req.rawBody) {
      throw new BadRequestException(
        'Raw body unavailable — configure bodyParser.raw() for /webhooks/* in main.ts (PAY-1)',
      );
    }
    const rawBody = req.rawBody;

    const signature =
      (req.headers['stripe-signature'] as string | undefined) ??
      (req.headers['x-razorpay-signature'] as string | undefined);

    const sourceIp = (req.headers['x-forwarded-for'] as string | undefined)
      ?? req.socket.remoteAddress
      ?? undefined;

    const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';

    const result = await this.handler.handle({
      provider:  provider.toLowerCase(),
      tenantId,
      rawBody,
      signature,
      payload:   req.body as Record<string, unknown>,
      sourceIp,
    });

    return { received: true, status: result.status };
  }
}

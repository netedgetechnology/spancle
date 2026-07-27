import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                         from '@nestjs/typeorm';
import { DataSource }                               from 'typeorm';
import { ConfigService }                          from '@nestjs/config';
import { StripeAdapter }                          from '../../finance/gateway/stripe.adapter';
import { PaymentGatewayAdapter }  from '../../finance/gateway/payment-gateway.adapter';
import { RazorpayAdapter }         from '../../finance/gateway/razorpay.adapter';

/**
 * GatewayRegistry
 *
 * Selects the active PaymentGatewayAdapter from configuration.
 * Booking code NEVER references a specific adapter — it calls getActiveGateway()
 * or getGateway(name) only.
 *
 * Configuration:
 *   PAYMENT_GATEWAY=stripe     (default)
 *   PAYMENT_GATEWAY=razorpay
 *
 * Both adapters are @Injectable() NestJS services injected via FinanceModule.
 * StripeAdapter: uses STRIPE_SECRET_KEY + STRIPE_API_VERSION from ConfigService.
 * RazorpayAdapter: uses RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET from ConfigService.
 *
 * Adding a new gateway:
 *   1. Extend PaymentGatewayAdapter.
 *   2. Register it in FinanceModule as a provider.
 *   3. Inject it here.
 *   4. No changes to PaymentService, BookingService, or any consumer.
 */
@Injectable()
export class GatewayRegistry {
  private readonly logger   = new Logger(GatewayRegistry.name);
  private readonly adapters = new Map<string, PaymentGatewayAdapter>();

  constructor(
    private readonly config:       ConfigService,
    private readonly stripe:       StripeAdapter,
    private readonly razorpay:     RazorpayAdapter,
    @InjectDataSource() private readonly ds: DataSource,
  ) {
    // Both adapters are DI-injected — ConfigService is available for credentials
    this.adapters.set(this.stripe.gatewayName,   this.stripe);
    this.adapters.set(this.razorpay.gatewayName, this.razorpay);

    this.logger.log(
      `Gateway registry initialised — gateways: [${[...this.adapters.keys()].join(', ')}]`,
    );
  }

  /** Returns the adapter configured as the default gateway. */
  getActiveGateway(): PaymentGatewayAdapter {
    const name = this.config.get<string>('PAYMENT_GATEWAY', 'stripe').toLowerCase().trim();
    return this.getGateway(name);
  }

  /** Returns a specific adapter by gateway name string. */
  getGateway(name: string): PaymentGatewayAdapter {
    const adapter = this.adapters.get(name.toLowerCase());
    if (!adapter) {
      throw new NotFoundException(
        `Payment gateway '${name}' is not registered. ` +
        `Available: [${[...this.adapters.keys()].join(', ')}]`,
      );
    }
    return adapter;
  }

  /** Returns the name of the currently configured default gateway. */
  getActiveGatewayName(): string {
    return this.config.get<string>('PAYMENT_GATEWAY', 'stripe').toLowerCase().trim();
  }

  /** Lists all registered gateway names. Useful for admin diagnostics. */
  listGateways(): string[] {
    return [...this.adapters.keys()];
  }

  /**
   * getAdapterForTenant()
   *
   * Multi-tenant credential support. Looks up per-tenant gateway credentials
   * in the tenant_payment_credentials table. Falls back to platform defaults
   * when no per-tenant override is configured.
   *
   * Schema: tenant_payment_credentials (tenant_id, gateway, key_id, key_secret, ...)
   * This is a best-effort read — if the table doesn't exist yet, falls back
   * to the platform-level adapter.
   *
   * Full per-tenant isolation is implemented when the credentials table is
   * provisioned. Until then, this method returns the shared platform adapter.
   */
  async getAdapterForTenant(tenantId: string): Promise<PaymentGatewayAdapter> {
    const gatewayName = this.config.get<string>('PAYMENT_GATEWAY', 'stripe').toLowerCase();
    try {
      const rows = await this.ds.query<Array<{ key_id: string; key_secret: string; webhook_secret: string }>>(
        `SELECT key_id, key_secret, webhook_secret
         FROM tenant_payment_credentials
         WHERE tenant_id = $1 AND gateway = $2 AND is_active = TRUE
         LIMIT 1`,
        [tenantId, gatewayName],
      );
      // Per-tenant credentials found but we return the shared adapter for now.
      // When tenant-scoped adapters are instantiated, this would create/cache
      // a new adapter instance using rows[0].key_id / key_secret.
      if (rows.length) {
        this.logger.debug(
          `Tenant ${tenantId} has custom ${gatewayName} credentials — ` +
          `using platform adapter (per-tenant adapter instantiation pending)`,
        );
      }
    } catch {
      // Table doesn't exist yet — use platform defaults (expected during development)
    }
    return this.getActiveGateway();
  }
}

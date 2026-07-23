import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService }         from '@nestjs/config';
import { StripeAdapter, RazorpayAdapter, PaymentGatewayAdapter } from '../../finance/gateway/payment-gateway.adapter';

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
 * Adding a new gateway:
 *   1. Extend PaymentGatewayAdapter (existing abstract class).
 *   2. Register it here.
 *   3. No changes to PaymentService, BookingService, or any consumer.
 *
 * Adapters are created lazily to avoid loading unused SDK dependencies.
 */
@Injectable()
export class GatewayRegistry {
  private readonly logger    = new Logger(GatewayRegistry.name);
  private readonly adapters  = new Map<string, PaymentGatewayAdapter>();

  constructor(private readonly config: ConfigService) {
    // Register all available adapters — 'stripe' and 'razorpay' are built-in
    const stripe   = new StripeAdapter();   // gatewayName = 'stripe'
    const razorpay = new RazorpayAdapter(); // gatewayName = 'razorpay'

    this.adapters.set(stripe.gatewayName,   stripe);
    this.adapters.set(razorpay.gatewayName, razorpay);

    this.logger.log(
      `Gateway registry initialised — gateways: [${[...this.adapters.keys()].join(', ')}]`,
    );
  }

  /**
   * Returns the adapter configured as the default gateway.
   * Reads PAYMENT_GATEWAY env var; defaults to 'stripe'.
   */
  getActiveGateway(): PaymentGatewayAdapter {
    const name = this.config.get<string>('PAYMENT_GATEWAY', 'stripe').toLowerCase().trim();
    return this.getGateway(name);
  }

  /**
   * Returns a specific adapter by gateway name string.
   * Used when the gateway name is already known (e.g. from a stored PaymentEntity.gateway).
   */
  getGateway(name: string): PaymentGatewayAdapter {
    const adapter = this.adapters.get(name.toLowerCase());
    if (!adapter) {
      throw new NotFoundException(
        `Payment gateway '${name}' is not registered. Available: [${[...this.adapters.keys()].join(', ')}]`,
      );
    }
    return adapter;
  }

  /**
   * Returns the name of the currently configured default gateway.
   * Used when creating a PaymentEntity to record which gateway was used.
   */
  getActiveGatewayName(): string {
    return this.config.get<string>('PAYMENT_GATEWAY', 'stripe').toLowerCase().trim();
  }

  /**
   * Lists all registered gateway names. Useful for admin diagnostics.
   */
  listGateways(): string[] {
    return [...this.adapters.keys()];
  }
}

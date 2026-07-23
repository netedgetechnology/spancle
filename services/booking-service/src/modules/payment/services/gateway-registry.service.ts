import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService }                          from '@nestjs/config';
import { StripeAdapter }                          from '../../finance/gateway/stripe.adapter';
import {
  PaymentGatewayAdapter,
  RazorpayAdapter,
} from '../../finance/gateway/payment-gateway.adapter';

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
 * Fix (Batch 7.5):
 *   StripeAdapter is now DI-injected (receives ConfigService for STRIPE_SECRET_KEY).
 *   RazorpayAdapter remains a stub (Batch 7.5 Razorpay sprint).
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
    private readonly config:  ConfigService,
    private readonly stripe:  StripeAdapter,
  ) {
    // StripeAdapter is DI-injected — ConfigService is available for API key
    this.adapters.set(this.stripe.gatewayName, this.stripe);

    // RazorpayAdapter remains a stub until Batch 7.5 Razorpay sprint
    const razorpay = new RazorpayAdapter(); // gatewayName = 'razorpay'
    this.adapters.set(razorpay.gatewayName, razorpay);

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
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const payment_gateway_adapter_1 = require("./payment-gateway.adapter");
let StripeAdapter = StripeAdapter_1 = class StripeAdapter extends payment_gateway_adapter_1.PaymentGatewayAdapter {
    constructor(config) {
        super();
        this.config = config;
        this.gatewayName = 'stripe';
        this.logger = new common_1.Logger(StripeAdapter_1.name);
    }
    onModuleInit() {
        const secretKey = this.config.get('STRIPE_SECRET_KEY');
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY is not set — Stripe adapter will throw on first use. ' +
                'Set STRIPE_SECRET_KEY to a valid secret key.');
        }
        const apiVersion = this.config.get('STRIPE_API_VERSION', '2024-06-20');
        this.stripe = new stripe_1.default(secretKey ?? '', { apiVersion });
        this.logger.log(`StripeAdapter initialised — apiVersion=${apiVersion}`);
    }
    async initiate(input) {
        const captureMethod = this.config.get('STRIPE_CAPTURE_METHOD', 'automatic');
        const params = {
            amount: input.amountMinor,
            currency: input.currency.toLowerCase(),
            capture_method: captureMethod,
            metadata: {
                idempotency_key: input.idempotencyKey,
                tenant_id: input.tenantId,
                ...(input.metadata ? this.flattenMetadata(input.metadata) : {}),
            },
            ...(input.customerId ? { customer: input.customerId } : {}),
        };
        const intent = await this.stripe.paymentIntents.create(params, {
            idempotencyKey: input.idempotencyKey,
        });
        this.logger.debug(`PaymentIntent created — id=${intent.id} status=${intent.status} ` +
            `amount=${intent.amount} currency=${intent.currency}`);
        return {
            gatewayPaymentId: intent.id,
            gatewayStatus: intent.status,
            clientSecret: intent.client_secret ?? undefined,
            rawResponse: intent,
        };
    }
    async capture(input) {
        const existing = await this.stripe.paymentIntents.retrieve(input.gatewayPaymentId);
        if (existing.status === 'succeeded') {
            this.logger.debug(`PaymentIntent ${input.gatewayPaymentId} already succeeded — skipping capture`);
            return {
                gatewayPaymentId: existing.id,
                gatewayStatus: existing.status,
                capturedMinor: existing.amount_received,
                rawResponse: existing,
            };
        }
        if (existing.status !== 'requires_capture') {
            this.logger.warn(`PaymentIntent ${input.gatewayPaymentId} in unexpected status ` +
                `'${existing.status}' for capture — returning as-is`);
            return {
                gatewayPaymentId: existing.id,
                gatewayStatus: existing.status,
                capturedMinor: existing.amount_received,
                rawResponse: existing,
            };
        }
        const captured = await this.stripe.paymentIntents.capture(input.gatewayPaymentId, { amount_to_capture: input.amountMinor }, { idempotencyKey: input.idempotencyKey });
        this.logger.debug(`PaymentIntent captured — id=${captured.id} ` +
            `amount_received=${captured.amount_received}`);
        return {
            gatewayPaymentId: captured.id,
            gatewayStatus: captured.status,
            capturedMinor: captured.amount_received,
            rawResponse: captured,
        };
    }
    async reconcile(input) {
        const intent = await this.stripe.paymentIntents.retrieve(input.gatewayPaymentId);
        return {
            gatewayStatus: intent.status,
            capturedMinor: intent.amount_received > 0 ? intent.amount_received : null,
            rawResponse: intent,
        };
    }
    async refund(input) {
        const refund = await this.stripe.refunds.create({
            payment_intent: input.gatewayPaymentId,
            amount: input.amountMinor,
            metadata: {
                idempotency_key: input.idempotencyKey,
            },
        }, { idempotencyKey: input.idempotencyKey });
        this.logger.debug(`Stripe refund issued — id=${refund.id} ` +
            `amount=${refund.amount} status=${refund.status}`);
        return {
            gatewayRefundId: refund.id,
            gatewayStatus: refund.status ?? 'pending',
            rawResponse: refund,
        };
    }
    flattenMetadata(meta) {
        const out = {};
        for (const [k, v] of Object.entries(meta)) {
            if (v != null)
                out[k] = String(v);
        }
        return out;
    }
};
exports.StripeAdapter = StripeAdapter;
exports.StripeAdapter = StripeAdapter = StripeAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeAdapter);
//# sourceMappingURL=stripe.adapter.js.map
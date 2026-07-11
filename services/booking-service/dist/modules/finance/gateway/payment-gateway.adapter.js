"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayAdapter = exports.StripeAdapter = exports.PaymentGatewayAdapter = void 0;
class PaymentGatewayAdapter {
}
exports.PaymentGatewayAdapter = PaymentGatewayAdapter;
class StripeAdapter extends PaymentGatewayAdapter {
    constructor() {
        super(...arguments);
        this.gatewayName = 'stripe';
    }
    async initiate(input) {
        return {
            gatewayPaymentId: `pi_stub_${input.idempotencyKey}`,
            gatewayStatus: 'requires_payment_method',
            clientSecret: `pi_stub_${input.idempotencyKey}_secret`,
            rawResponse: { stub: true, gateway: 'stripe', input },
        };
    }
    async capture(input) {
        return {
            gatewayPaymentId: input.gatewayPaymentId,
            gatewayStatus: 'succeeded',
            capturedMinor: input.amountMinor,
            rawResponse: { stub: true, gateway: 'stripe', input },
        };
    }
    async reconcile(input) {
        return {
            gatewayStatus: 'succeeded',
            capturedMinor: null,
            rawResponse: { stub: true, gateway: 'stripe', input },
        };
    }
}
exports.StripeAdapter = StripeAdapter;
class RazorpayAdapter extends PaymentGatewayAdapter {
    constructor() {
        super(...arguments);
        this.gatewayName = 'razorpay';
    }
    async initiate(input) {
        return {
            gatewayPaymentId: `order_stub_${input.idempotencyKey}`,
            gatewayStatus: 'created',
            rawResponse: { stub: true, gateway: 'razorpay', input },
        };
    }
    async capture(input) {
        return {
            gatewayPaymentId: input.gatewayPaymentId,
            gatewayStatus: 'captured',
            capturedMinor: input.amountMinor,
            rawResponse: { stub: true, gateway: 'razorpay', input },
        };
    }
    async reconcile(input) {
        return {
            gatewayStatus: 'captured',
            capturedMinor: null,
            rawResponse: { stub: true, gateway: 'razorpay', input },
        };
    }
}
exports.RazorpayAdapter = RazorpayAdapter;
//# sourceMappingURL=payment-gateway.adapter.js.map
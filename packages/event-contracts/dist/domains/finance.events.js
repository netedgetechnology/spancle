"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINANCE_EVENT_SCHEMAS = exports.PaymentFailedPayloadSchema = exports.PaymentSucceededPayloadSchema = exports.InvoicePaidPayloadSchema = exports.InvoiceCreatedPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
const MoneySchema = zod_1.z.object({ amount: zod_1.z.number().int().min(0), currency: zod_1.z.string().length(3) });
const BaseFinancePayload = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
});
exports.InvoiceCreatedPayloadSchema = BaseFinancePayload.extend({
    invoiceId: zod_1.z.string().uuid(),
    invoiceNumber: zod_1.z.string(),
    total: MoneySchema,
    dueDate: zod_1.z.string().date(),
});
exports.InvoicePaidPayloadSchema = BaseFinancePayload.extend({
    invoiceId: zod_1.z.string().uuid(),
    paidAt: zod_1.z.string().datetime(),
    total: MoneySchema,
    paymentId: zod_1.z.string().uuid(),
});
exports.PaymentSucceededPayloadSchema = BaseFinancePayload.extend({
    paymentId: zod_1.z.string().uuid(),
    invoiceId: zod_1.z.string().uuid().optional(),
    amount: MoneySchema,
    method: zod_1.z.string(),
    reference: zod_1.z.string().optional(),
});
exports.PaymentFailedPayloadSchema = BaseFinancePayload.extend({
    paymentId: zod_1.z.string().uuid(),
    amount: MoneySchema,
    reason: zod_1.z.string(),
    retryable: zod_1.z.boolean().default(false),
});
exports.FINANCE_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.INVOICE_CREATED]: exports.InvoiceCreatedPayloadSchema,
    [event_registry_1.EventRegistry.INVOICE_PAID]: exports.InvoicePaidPayloadSchema,
    [event_registry_1.EventRegistry.PAYMENT_SUCCEEDED]: exports.PaymentSucceededPayloadSchema,
    [event_registry_1.EventRegistry.PAYMENT_FAILED]: exports.PaymentFailedPayloadSchema,
};
//# sourceMappingURL=finance.events.js.map
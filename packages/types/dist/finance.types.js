"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInvoiceSchema = exports.InvoiceLineItemSchema = exports.PaymentStatusSchema = exports.PaymentMethodSchema = exports.InvoiceStatusSchema = void 0;
const zod_1 = require("zod");
const common_types_1 = require("./common.types");
exports.InvoiceStatusSchema = zod_1.z.enum([
    'draft', 'issued', 'paid', 'overdue', 'void', 'refunded',
]);
exports.PaymentMethodSchema = zod_1.z.enum([
    'card', 'bank_transfer', 'cash', 'wallet', 'stripe', 'paypal',
]);
exports.PaymentStatusSchema = zod_1.z.enum([
    'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed',
]);
exports.InvoiceLineItemSchema = zod_1.z.object({
    description: zod_1.z.string().max(500),
    quantity: zod_1.z.number().positive(),
    unitPrice: common_types_1.MoneySchema,
    total: common_types_1.MoneySchema,
    taxRate: zod_1.z.number().min(0).max(1).default(0),
});
exports.CreateInvoiceSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    lineItems: zod_1.z.array(exports.InvoiceLineItemSchema).min(1),
    dueDate: zod_1.z.string().date(),
    notes: zod_1.z.string().max(2000).optional(),
    referenceId: zod_1.z.string().max(100).optional(),
});
//# sourceMappingURL=finance.types.js.map
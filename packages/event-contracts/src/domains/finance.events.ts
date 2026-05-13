import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

const MoneySchema = z.object({ amount: z.number().int().min(0), currency: z.string().length(3) });

const BaseFinancePayload = z.object({
  tenantId: z.string().uuid(),
  userId:   z.string().uuid(),
});

export const InvoiceCreatedPayloadSchema = BaseFinancePayload.extend({
  invoiceId:     z.string().uuid(),
  invoiceNumber: z.string(),
  total:         MoneySchema,
  dueDate:       z.string().date(),
});

export const InvoicePaidPayloadSchema = BaseFinancePayload.extend({
  invoiceId:  z.string().uuid(),
  paidAt:     z.string().datetime(),
  total:      MoneySchema,
  paymentId:  z.string().uuid(),
});

export const PaymentSucceededPayloadSchema = BaseFinancePayload.extend({
  paymentId:  z.string().uuid(),
  invoiceId:  z.string().uuid().optional(),
  amount:     MoneySchema,
  method:     z.string(),
  reference:  z.string().optional(),
});

export const PaymentFailedPayloadSchema = BaseFinancePayload.extend({
  paymentId:    z.string().uuid(),
  amount:       MoneySchema,
  reason:       z.string(),
  retryable:    z.boolean().default(false),
});

export type InvoiceCreatedPayload    = z.infer<typeof InvoiceCreatedPayloadSchema>;
export type InvoicePaidPayload       = z.infer<typeof InvoicePaidPayloadSchema>;
export type PaymentSucceededPayload  = z.infer<typeof PaymentSucceededPayloadSchema>;
export type PaymentFailedPayload     = z.infer<typeof PaymentFailedPayloadSchema>;

export const FINANCE_EVENT_SCHEMAS = {
  [EventRegistry.INVOICE_CREATED]:   InvoiceCreatedPayloadSchema,
  [EventRegistry.INVOICE_PAID]:      InvoicePaidPayloadSchema,
  [EventRegistry.PAYMENT_SUCCEEDED]: PaymentSucceededPayloadSchema,
  [EventRegistry.PAYMENT_FAILED]:    PaymentFailedPayloadSchema,
} as const;

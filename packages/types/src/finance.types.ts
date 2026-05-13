import { z } from 'zod';
import type { AuditFields, Money, TenantId, UUID } from './common.types';
import { MoneySchema } from './common.types';

export const InvoiceStatusSchema = z.enum([
  'draft', 'issued', 'paid', 'overdue', 'void', 'refunded',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const PaymentMethodSchema = z.enum([
  'card', 'bank_transfer', 'cash', 'wallet', 'stripe', 'paypal',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatusSchema = z.enum([
  'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const InvoiceLineItemSchema = z.object({
  description: z.string().max(500),
  quantity:    z.number().positive(),
  unitPrice:   MoneySchema,
  total:       MoneySchema,
  taxRate:     z.number().min(0).max(1).default(0),
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const CreateInvoiceSchema = z.object({
  userId:      z.string().uuid(),
  lineItems:   z.array(InvoiceLineItemSchema).min(1),
  dueDate:     z.string().date(),
  notes:       z.string().max(2000).optional(),
  referenceId: z.string().max(100).optional(),
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;

export interface Invoice extends AuditFields {
  id:            UUID;
  tenantId:      TenantId;
  userId:        UUID;
  invoiceNumber: string;
  status:        InvoiceStatus;
  lineItems:     InvoiceLineItem[];
  subtotal:      Money;
  taxTotal:      Money;
  total:         Money;
  dueDate:       Date;
  paidAt?:       Date;
  notes?:        string;
  isDeleted:     boolean;
}

export interface Wallet extends AuditFields {
  id:         UUID;
  tenantId:   TenantId;
  userId:     UUID;
  balance:    Money;
  isActive:   boolean;
  isDeleted:  boolean;
}

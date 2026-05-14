import { z } from 'zod';
import type { AuditFields, Money, TenantId, UUID } from './common.types';
export declare const InvoiceStatusSchema: z.ZodEnum<["draft", "issued", "paid", "overdue", "void", "refunded"]>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export declare const PaymentMethodSchema: z.ZodEnum<["card", "bank_transfer", "cash", "wallet", "stripe", "paypal"]>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export declare const PaymentStatusSchema: z.ZodEnum<["pending", "processing", "succeeded", "failed", "refunded", "disputed"]>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export declare const InvoiceLineItemSchema: z.ZodObject<{
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
    }, {
        currency: string;
        amount: number;
    }>;
    total: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
    }, {
        currency: string;
        amount: number;
    }>;
    taxRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description: string;
    quantity: number;
    unitPrice: {
        currency: string;
        amount: number;
    };
    total: {
        currency: string;
        amount: number;
    };
    taxRate: number;
}, {
    description: string;
    quantity: number;
    unitPrice: {
        currency: string;
        amount: number;
    };
    total: {
        currency: string;
        amount: number;
    };
    taxRate?: number | undefined;
}>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
export declare const CreateInvoiceSchema: z.ZodObject<{
    userId: z.ZodString;
    lineItems: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amount: number;
        }, {
            currency: string;
            amount: number;
        }>;
        total: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amount: number;
        }, {
            currency: string;
            amount: number;
        }>;
        taxRate: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPrice: {
            currency: string;
            amount: number;
        };
        total: {
            currency: string;
            amount: number;
        };
        taxRate: number;
    }, {
        description: string;
        quantity: number;
        unitPrice: {
            currency: string;
            amount: number;
        };
        total: {
            currency: string;
            amount: number;
        };
        taxRate?: number | undefined;
    }>, "many">;
    dueDate: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    referenceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: {
            currency: string;
            amount: number;
        };
        total: {
            currency: string;
            amount: number;
        };
        taxRate: number;
    }[];
    dueDate: string;
    notes?: string | undefined;
    referenceId?: string | undefined;
}, {
    userId: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: {
            currency: string;
            amount: number;
        };
        total: {
            currency: string;
            amount: number;
        };
        taxRate?: number | undefined;
    }[];
    dueDate: string;
    notes?: string | undefined;
    referenceId?: string | undefined;
}>;
export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
export interface Invoice extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    userId: UUID;
    invoiceNumber: string;
    status: InvoiceStatus;
    lineItems: InvoiceLineItem[];
    subtotal: Money;
    taxTotal: Money;
    total: Money;
    dueDate: Date;
    paidAt?: Date;
    notes?: string;
    isDeleted: boolean;
}
export interface Wallet extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    userId: UUID;
    balance: Money;
    isActive: boolean;
    isDeleted: boolean;
}
//# sourceMappingURL=finance.types.d.ts.map
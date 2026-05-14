import { z } from 'zod';
export declare const InvoiceCreatedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
} & {
    invoiceId: z.ZodString;
    invoiceNumber: z.ZodString;
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
    dueDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    invoiceId: string;
    invoiceNumber: string;
    total: {
        currency: string;
        amount: number;
    };
    dueDate: string;
}, {
    tenantId: string;
    userId: string;
    invoiceId: string;
    invoiceNumber: string;
    total: {
        currency: string;
        amount: number;
    };
    dueDate: string;
}>;
export declare const InvoicePaidPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
} & {
    invoiceId: z.ZodString;
    paidAt: z.ZodString;
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
    paymentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    invoiceId: string;
    total: {
        currency: string;
        amount: number;
    };
    paidAt: string;
    paymentId: string;
}, {
    tenantId: string;
    userId: string;
    invoiceId: string;
    total: {
        currency: string;
        amount: number;
    };
    paidAt: string;
    paymentId: string;
}>;
export declare const PaymentSucceededPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
} & {
    paymentId: z.ZodString;
    invoiceId: z.ZodOptional<z.ZodString>;
    amount: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
    }, {
        currency: string;
        amount: number;
    }>;
    method: z.ZodString;
    reference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    method: string;
    tenantId: string;
    userId: string;
    amount: {
        currency: string;
        amount: number;
    };
    paymentId: string;
    invoiceId?: string | undefined;
    reference?: string | undefined;
}, {
    method: string;
    tenantId: string;
    userId: string;
    amount: {
        currency: string;
        amount: number;
    };
    paymentId: string;
    invoiceId?: string | undefined;
    reference?: string | undefined;
}>;
export declare const PaymentFailedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
} & {
    paymentId: z.ZodString;
    amount: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
    }, {
        currency: string;
        amount: number;
    }>;
    reason: z.ZodString;
    retryable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    reason: string;
    amount: {
        currency: string;
        amount: number;
    };
    paymentId: string;
    retryable: boolean;
}, {
    tenantId: string;
    userId: string;
    reason: string;
    amount: {
        currency: string;
        amount: number;
    };
    paymentId: string;
    retryable?: boolean | undefined;
}>;
export type InvoiceCreatedPayload = z.infer<typeof InvoiceCreatedPayloadSchema>;
export type InvoicePaidPayload = z.infer<typeof InvoicePaidPayloadSchema>;
export type PaymentSucceededPayload = z.infer<typeof PaymentSucceededPayloadSchema>;
export type PaymentFailedPayload = z.infer<typeof PaymentFailedPayloadSchema>;
export declare const FINANCE_EVENT_SCHEMAS: {
    readonly "spancle.invoice.created": z.ZodObject<{
        tenantId: z.ZodString;
        userId: z.ZodString;
    } & {
        invoiceId: z.ZodString;
        invoiceNumber: z.ZodString;
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
        dueDate: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        invoiceId: string;
        invoiceNumber: string;
        total: {
            currency: string;
            amount: number;
        };
        dueDate: string;
    }, {
        tenantId: string;
        userId: string;
        invoiceId: string;
        invoiceNumber: string;
        total: {
            currency: string;
            amount: number;
        };
        dueDate: string;
    }>;
    readonly "spancle.invoice.paid": z.ZodObject<{
        tenantId: z.ZodString;
        userId: z.ZodString;
    } & {
        invoiceId: z.ZodString;
        paidAt: z.ZodString;
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
        paymentId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        invoiceId: string;
        total: {
            currency: string;
            amount: number;
        };
        paidAt: string;
        paymentId: string;
    }, {
        tenantId: string;
        userId: string;
        invoiceId: string;
        total: {
            currency: string;
            amount: number;
        };
        paidAt: string;
        paymentId: string;
    }>;
    readonly "spancle.payment.succeeded": z.ZodObject<{
        tenantId: z.ZodString;
        userId: z.ZodString;
    } & {
        paymentId: z.ZodString;
        invoiceId: z.ZodOptional<z.ZodString>;
        amount: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amount: number;
        }, {
            currency: string;
            amount: number;
        }>;
        method: z.ZodString;
        reference: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        method: string;
        tenantId: string;
        userId: string;
        amount: {
            currency: string;
            amount: number;
        };
        paymentId: string;
        invoiceId?: string | undefined;
        reference?: string | undefined;
    }, {
        method: string;
        tenantId: string;
        userId: string;
        amount: {
            currency: string;
            amount: number;
        };
        paymentId: string;
        invoiceId?: string | undefined;
        reference?: string | undefined;
    }>;
    readonly "spancle.payment.failed": z.ZodObject<{
        tenantId: z.ZodString;
        userId: z.ZodString;
    } & {
        paymentId: z.ZodString;
        amount: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amount: number;
        }, {
            currency: string;
            amount: number;
        }>;
        reason: z.ZodString;
        retryable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        reason: string;
        amount: {
            currency: string;
            amount: number;
        };
        paymentId: string;
        retryable: boolean;
    }, {
        tenantId: string;
        userId: string;
        reason: string;
        amount: {
            currency: string;
            amount: number;
        };
        paymentId: string;
        retryable?: boolean | undefined;
    }>;
};
//# sourceMappingURL=finance.events.d.ts.map
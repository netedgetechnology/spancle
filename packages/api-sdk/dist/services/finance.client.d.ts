import type { Invoice, CreateInvoiceDto, Wallet, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * FinanceClient — typed client for finance-service.
 *
 * Covers: invoicing, payment processing, wallet management.
 * Idempotency keys required on all write operations via ctx.withIdempotencyKey().
 */
export declare const FinanceClient: {
    createInvoice(dto: CreateInvoiceDto, ctx: RequestContext): Promise<Invoice>;
    getInvoiceById(invoiceId: string, ctx: RequestContext): Promise<Invoice>;
    listInvoices(params: {
        page?: number;
        limit?: number;
        userId?: string;
        status?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Invoice>>;
    issueInvoice(invoiceId: string, ctx: RequestContext): Promise<Invoice>;
    voidInvoice(invoiceId: string, reason: string, ctx: RequestContext): Promise<Invoice>;
    initiatePayment(invoiceId: string, dto: {
        method: string;
        reference?: string;
    }, ctx: RequestContext): Promise<{
        paymentId: string;
        status: string;
        redirectUrl?: string;
    }>;
    getPaymentById(paymentId: string, ctx: RequestContext): Promise<{
        id: string;
        status: string;
        amount: {
            amount: number;
            currency: string;
        };
    }>;
    refundPayment(paymentId: string, dto: {
        amount?: number;
        reason: string;
    }, ctx: RequestContext): Promise<void>;
    getWalletByUserId(userId: string, ctx: RequestContext): Promise<Wallet>;
    creditWallet(walletId: string, dto: {
        amount: number;
        currency: string;
        reason: string;
    }, ctx: RequestContext): Promise<Wallet>;
    debitWallet(walletId: string, dto: {
        amount: number;
        currency: string;
        reason: string;
    }, ctx: RequestContext): Promise<Wallet>;
};
//# sourceMappingURL=finance.client.d.ts.map
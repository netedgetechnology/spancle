import type {
  Invoice,
  CreateInvoiceDto,
  Wallet,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('finance');

/**
 * FinanceClient — typed client for finance-service.
 *
 * Covers: invoicing, payment processing, wallet management.
 * Idempotency keys required on all write operations via ctx.withIdempotencyKey().
 */
export const FinanceClient = {

  // ── Invoices ──────────────────────────────────────────────────────────────

  async createInvoice(dto: CreateInvoiceDto, ctx: RequestContext): Promise<Invoice> {
    return http.post<Invoice>('/invoices', dto, ctx);
  },

  async getInvoiceById(invoiceId: string, ctx: RequestContext): Promise<Invoice> {
    return http.get<Invoice>(`/invoices/${invoiceId}`, ctx);
  },

  async listInvoices(
    params: { page?: number; limit?: number; userId?: string; status?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Invoice>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<Invoice>>(`/invoices${query ? `?${query}` : ''}`, ctx);
  },

  async issueInvoice(invoiceId: string, ctx: RequestContext): Promise<Invoice> {
    return http.post<Invoice>(`/invoices/${invoiceId}/issue`, {}, ctx);
  },

  async voidInvoice(
    invoiceId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<Invoice> {
    return http.post<Invoice>(`/invoices/${invoiceId}/void`, { reason }, ctx);
  },

  // ── Payments ──────────────────────────────────────────────────────────────

  async initiatePayment(
    invoiceId: string,
    dto: { method: string; reference?: string },
    ctx: RequestContext,
  ): Promise<{ paymentId: string; status: string; redirectUrl?: string }> {
    return http.post(`/payments`, { invoiceId, ...dto }, ctx);
  },

  async getPaymentById(
    paymentId: string,
    ctx: RequestContext,
  ): Promise<{ id: string; status: string; amount: { amount: number; currency: string } }> {
    return http.get(`/payments/${paymentId}`, ctx);
  },

  async refundPayment(
    paymentId: string,
    dto: { amount?: number; reason: string },
    ctx: RequestContext,
  ): Promise<void> {
    return http.post<void>(`/payments/${paymentId}/refund`, dto, ctx);
  },

  // ── Wallets ───────────────────────────────────────────────────────────────

  async getWalletByUserId(userId: string, ctx: RequestContext): Promise<Wallet> {
    return http.get<Wallet>(`/wallets/user/${userId}`, ctx);
  },

  async creditWallet(
    walletId: string,
    dto: { amount: number; currency: string; reason: string },
    ctx: RequestContext,
  ): Promise<Wallet> {
    return http.post<Wallet>(`/wallets/${walletId}/credit`, dto, ctx);
  },

  async debitWallet(
    walletId: string,
    dto: { amount: number; currency: string; reason: string },
    ctx: RequestContext,
  ): Promise<Wallet> {
    return http.post<Wallet>(`/wallets/${walletId}/debit`, dto, ctx);
  },
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('finance');
/**
 * FinanceClient — typed client for finance-service.
 *
 * Covers: invoicing, payment processing, wallet management.
 * Idempotency keys required on all write operations via ctx.withIdempotencyKey().
 */
exports.FinanceClient = {
    // ── Invoices ──────────────────────────────────────────────────────────────
    async createInvoice(dto, ctx) {
        return http.post('/invoices', dto, ctx);
    },
    async getInvoiceById(invoiceId, ctx) {
        return http.get(`/invoices/${invoiceId}`, ctx);
    },
    async listInvoices(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/invoices${query ? `?${query}` : ''}`, ctx);
    },
    async issueInvoice(invoiceId, ctx) {
        return http.post(`/invoices/${invoiceId}/issue`, {}, ctx);
    },
    async voidInvoice(invoiceId, reason, ctx) {
        return http.post(`/invoices/${invoiceId}/void`, { reason }, ctx);
    },
    // ── Payments ──────────────────────────────────────────────────────────────
    async initiatePayment(invoiceId, dto, ctx) {
        return http.post(`/payments`, { invoiceId, ...dto }, ctx);
    },
    async getPaymentById(paymentId, ctx) {
        return http.get(`/payments/${paymentId}`, ctx);
    },
    async refundPayment(paymentId, dto, ctx) {
        return http.post(`/payments/${paymentId}/refund`, dto, ctx);
    },
    // ── Wallets ───────────────────────────────────────────────────────────────
    async getWalletByUserId(userId, ctx) {
        return http.get(`/wallets/user/${userId}`, ctx);
    },
    async creditWallet(walletId, dto, ctx) {
        return http.post(`/wallets/${walletId}/credit`, dto, ctx);
    },
    async debitWallet(walletId, dto, ctx) {
        return http.post(`/wallets/${walletId}/debit`, dto, ctx);
    },
};
//# sourceMappingURL=finance.client.js.map
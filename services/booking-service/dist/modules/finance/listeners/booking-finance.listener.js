"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BookingFinanceListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingFinanceListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_service_1 = require("../services/invoice.service");
const refund_service_1 = require("../services/refund.service");
const invoice_repository_1 = require("../repositories/invoice.repository");
const payment_repository_1 = require("../repositories/payment.repository");
const BOOKING_CONFIRMED = 'spancle.booking.confirmed';
const BOOKING_CANCELLED = 'spancle.booking.cancelled';
const BOOKING_REFUNDED = 'spancle.booking.refunded';
let BookingFinanceListener = BookingFinanceListener_1 = class BookingFinanceListener {
    constructor(invoiceService, refundService, invoiceRepository, paymentRepository, dataSource) {
        this.invoiceService = invoiceService;
        this.refundService = refundService;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BookingFinanceListener_1.name);
    }
    async fetchBooking(bookingId, tenantId) {
        const rows = await this.dataSource.query(`SELECT id, tenant_id, reference, court_id, user_id,
              customer_name, customer_email, currency,
              final_price_minor, amount_paid_minor, amount_refunded_minor,
              starts_at, ends_at, status
       FROM bookings
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       LIMIT 1`, [bookingId, tenantId]);
        return rows[0] ?? null;
    }
    async onBookingConfirmed(payload) {
        const { tenantId, bookingId, actorId } = payload;
        try {
            const existing = await this.invoiceRepository.findReference('booking', bookingId, tenantId);
            if (existing) {
                this.logger.debug(`onBookingConfirmed: invoice already exists for booking ${bookingId} (${existing.invoiceNumber ?? existing.invoiceId}) — skip`);
                return;
            }
            const booking = await this.fetchBooking(bookingId, tenantId);
            if (!booking) {
                this.logger.warn(`onBookingConfirmed: booking ${bookingId} not found — skip`);
                return;
            }
            if (!booking.final_price_minor || booking.final_price_minor <= 0) {
                this.logger.debug(`onBookingConfirmed: booking ${bookingId} is free (finalPriceMinor=${booking.final_price_minor}) — no invoice`);
                return;
            }
            const { invoice } = await this.invoiceService.draft({
                sourceType: 'booking',
                sourceId: bookingId,
                customerId: booking.user_id ?? undefined,
                customerName: booking.customer_name,
                customerEmail: booking.customer_email,
                currency: booking.currency,
                lines: [
                    {
                        description: `Court booking — ${booking.reference}`,
                        lineType: 'court_booking',
                        quantity: 1,
                        unitPriceMinor: booking.final_price_minor,
                    },
                ],
            }, tenantId, actorId);
            await this.invoiceService.finalise(invoice.id, {}, tenantId, actorId);
            this.logger.log(`onBookingConfirmed: invoice created and finalised for booking ${bookingId} ` +
                `(${booking.final_price_minor} ${booking.currency}) — tenant ${tenantId}`);
        }
        catch (err) {
            this.logger.error(`onBookingConfirmed: failed for booking ${bookingId} — ${err.message}`, err.stack);
        }
    }
    async onBookingCancelled(payload) {
        const { tenantId, bookingId, actorId } = payload;
        try {
            const ref = await this.invoiceRepository.findReference('booking', bookingId, tenantId);
            if (!ref) {
                this.logger.debug(`onBookingCancelled: no invoice for booking ${bookingId} — skip`);
                return;
            }
            const invoice = await this.invoiceRepository.findById(ref.invoiceId, tenantId);
            if (!invoice) {
                this.logger.warn(`onBookingCancelled: InvoiceReference points to missing invoice ${ref.invoiceId} — skip`);
                return;
            }
            if (invoice.status === 'voided' || invoice.status === 'refunded') {
                this.logger.debug(`onBookingCancelled: invoice ${ref.invoiceNumber} already ${invoice.status} — skip`);
                return;
            }
            await this.invoiceService.void(invoice.id, { reason: 'Booking cancelled' }, tenantId, actorId);
            this.logger.log(`onBookingCancelled: invoice ${ref.invoiceNumber} voided for booking ${bookingId} — tenant ${tenantId}`);
        }
        catch (err) {
            this.logger.error(`onBookingCancelled: failed for booking ${bookingId} — ${err.message}`, err.stack);
        }
    }
    async onBookingRefunded(payload) {
        const { tenantId, bookingId, bookingRefundId, amountMinor, currency, actorId } = payload;
        try {
            const ref = await this.invoiceRepository.findReference('booking', bookingId, tenantId);
            if (!ref) {
                this.logger.warn(`onBookingRefunded: no invoice for booking ${bookingId} — cannot create Finance refund`);
                return;
            }
            const allocations = await this.paymentRepository.findAllocationsByInvoice(ref.invoiceId, tenantId);
            if (!allocations.length) {
                this.logger.warn(`onBookingRefunded: no payment allocations for invoice ${ref.invoiceId} — cannot create Finance refund`);
                return;
            }
            const allocation = allocations[allocations.length - 1];
            await this.refundService.requestRefund({
                paymentId: allocation.paymentId,
                invoiceId: ref.invoiceId,
                amountMinor,
                currency,
                idempotencyKey: `bkref_${bookingRefundId}`,
                sourceType: 'booking',
                sourceId: bookingId,
            }, tenantId, actorId);
            this.logger.log(`onBookingRefunded: Finance refund created for booking ${bookingId} ` +
                `(${amountMinor} ${currency}) — tenant ${tenantId}`);
        }
        catch (err) {
            this.logger.error(`onBookingRefunded: failed for booking ${bookingId} — ${err.message}`, err.stack);
        }
    }
};
exports.BookingFinanceListener = BookingFinanceListener;
__decorate([
    (0, event_emitter_1.OnEvent)(BOOKING_CONFIRMED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingFinanceListener.prototype, "onBookingConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)(BOOKING_CANCELLED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingFinanceListener.prototype, "onBookingCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)(BOOKING_REFUNDED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingFinanceListener.prototype, "onBookingRefunded", null);
exports.BookingFinanceListener = BookingFinanceListener = BookingFinanceListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [invoice_service_1.InvoiceService,
        refund_service_1.RefundService,
        invoice_repository_1.InvoiceRepository,
        payment_repository_1.PaymentRepository,
        typeorm_2.DataSource])
], BookingFinanceListener);
//# sourceMappingURL=booking-finance.listener.js.map
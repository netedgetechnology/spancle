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
var PaymentOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const gateway_registry_service_1 = require("./gateway-registry.service");
const payment_service_1 = require("../../finance/services/payment.service");
const booking_service_1 = require("../../booking/services/booking.service");
const redis_event_bus_publisher_1 = require("../../../common/event-bus/redis-event-bus.publisher");
const payment_events_1 = require("../../finance/events/payment.events");
const booking_events_1 = require("../../booking/events/booking.events");
const node_crypto_1 = require("node:crypto");
let PaymentOrchestratorService = PaymentOrchestratorService_1 = class PaymentOrchestratorService {
    constructor(gatewayRegistry, paymentService, bookingService, publisher, config, ds) {
        this.gatewayRegistry = gatewayRegistry;
        this.paymentService = paymentService;
        this.bookingService = bookingService;
        this.publisher = publisher;
        this.config = config;
        this.ds = ds;
        this.logger = new common_1.Logger(PaymentOrchestratorService_1.name);
    }
    async initiateForBooking(params) {
        const existing = await this.ds.query(`SELECT id, idempotency_key FROM booking_payments
       WHERE booking_id = $1 AND tenant_id = $2 AND status = 'pending' AND is_deleted = FALSE
       LIMIT 1`, [params.bookingId, params.tenantId]);
        if (existing.length) {
            this.logger.log(`Idempotent: returning existing pending payment for booking=${params.bookingId}`);
            const fp = await this.ds.query(`SELECT id, gateway_payment_id
         FROM finance_payments
         WHERE tenant_id = $1 AND idempotency_key = $2
         LIMIT 1`, [params.tenantId, existing[0].idempotency_key]);
            if (fp.length) {
                return {
                    bookingPaymentId: existing[0].id,
                    financePaymentId: fp[0].id,
                    clientSecret: undefined,
                    gatewayPaymentId: fp[0].gateway_payment_id ?? '',
                    gatewayName: this.gatewayRegistry.getActiveGatewayName(),
                    idempotencyKey: existing[0].idempotency_key,
                };
            }
        }
        const idempotencyKey = `bk_${params.bookingId}_${(0, node_crypto_1.randomUUID)()}`;
        const result = await this.ds.transaction(async (manager) => {
            const bpInsert = await manager.query(`INSERT INTO booking_payments
           (id, tenant_id, branch_id, booking_id, status, payment_method,
            amount_minor, currency, provider, idempotency_key, created_by_id,
            is_deleted, amount_refunded_minor, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, 'pending', 'card', $4, $5, $6, $7, $8,
            FALSE, 0, NOW(), NOW())
         RETURNING id`, [
                params.tenantId, params.branchId, params.bookingId,
                params.amountMinor, params.currency,
                this.gatewayRegistry.getActiveGatewayName(),
                idempotencyKey, params.actorId,
            ]);
            const bookingPaymentId = bpInsert[0].id;
            const financePayment = await this.paymentService.initiate({
                method: 'online_card',
                gateway: this.gatewayRegistry.getActiveGatewayName(),
                amountMinor: params.amountMinor,
                currency: params.currency,
                customerId: params.customerId,
                idempotencyKey,
                ipAddress: params.ipAddress,
            }, params.tenantId, params.actorId);
            return { bookingPaymentId, financePayment };
        });
        this.logger.log(`Payment initiated — booking=${params.bookingId} ` +
            `financePaymentId=${result.financePayment.id} ` +
            `gateway=${result.financePayment.gateway}`);
        return {
            bookingPaymentId: result.bookingPaymentId,
            financePaymentId: result.financePayment.id,
            clientSecret: result.financePayment.gatewayMetadata?.['clientSecret'],
            gatewayPaymentId: result.financePayment.gatewayPaymentId ?? '',
            gatewayName: result.financePayment.gateway,
            idempotencyKey,
        };
    }
    async onPaymentCaptured(payload) {
        const { tenantId, paymentId } = payload;
        const rows = await this.ds.query(`SELECT bp.booking_id, bp.id
       FROM booking_payments bp
       JOIN finance_payments fp
         ON fp.idempotency_key = bp.idempotency_key
         AND fp.tenant_id = bp.tenant_id
       WHERE fp.id = $1
         AND fp.tenant_id = $2
         AND bp.is_deleted = FALSE
       LIMIT 1`, [paymentId, tenantId]);
        if (!rows.length) {
            this.logger.warn(`onPaymentCaptured: no booking_payments row found for ` +
                `financePaymentId=${paymentId} tenant=${tenantId} — skipping confirm`);
            return;
        }
        const { booking_id: bookingId, id: bookingPaymentId } = rows[0];
        await this.ds.query(`UPDATE booking_payments
       SET status = 'paid', paid_at = NOW(), updated_at = NOW(),
           provider_payment_id = $1
       WHERE id = $2 AND tenant_id = $3 AND is_deleted = FALSE`, [payload.gatewayPaymentId ?? '', bookingPaymentId, tenantId]);
        await this.publisher.publishPaymentSucceeded({
            tenantId,
            paymentId,
            bookingId,
            amountMinor: payload.amountMinor,
            currency: payload.currency,
            gatewayPaymentId: payload.gatewayPaymentId ?? undefined,
        });
        try {
            await this.bookingService.confirm(bookingId, tenantId, 'system:payment');
            this.logger.log(`Booking confirmed after payment capture — ` +
                `bookingId=${bookingId} financePaymentId=${paymentId}`);
            await this.publisher.publishBookingConfirmed({
                tenantId,
                bookingId,
                actorId: 'system:payment',
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`onPaymentCaptured: BookingService.confirm failed for bookingId=${bookingId}: ${msg}`);
        }
    }
    async onBookingCancelled(payload) {
        const { tenantId, bookingId, actorId } = payload;
        const rows = await this.ds.query(`SELECT customer_email, customer_name, reference
       FROM bookings
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       LIMIT 1`, [bookingId, tenantId]);
        const customerEmail = rows[0]?.customer_email;
        const customerName = rows[0]?.customer_name;
        const reference = rows[0]?.reference;
        if (!customerEmail) {
            this.logger.warn(`onBookingCancelled: no customerEmail found for bookingId=${bookingId} — skipping Redis publish`);
            return;
        }
        await this.publisher.publishBookingCancelled({
            tenantId,
            bookingId,
            actorId: actorId ?? undefined,
            customerEmail,
            customerName,
            reference,
        });
    }
    async handlePaymentSuccess(params) {
        await this.paymentService.capture(params.financePaymentId, { amountMinor: params.capturedMinor }, params.tenantId, params.actorId);
        this.logger.log(`Payment success handled — financePaymentId=${params.financePaymentId}`);
    }
    async handlePaymentFailure(params) {
        await this.paymentService.fail(params.financePaymentId, { reason: params.reason }, params.tenantId, params.actorId);
        await this.ds.query(`UPDATE booking_payments
       SET status = 'failed', failed_at = NOW(), failure_reason = $1, updated_at = NOW()
       WHERE tenant_id = $2
         AND idempotency_key = (
           SELECT fp.idempotency_key FROM finance_payments fp
           WHERE fp.id = $3 AND fp.tenant_id = $2
         )
         AND is_deleted = FALSE`, [params.reason, params.tenantId, params.financePaymentId]);
        await this.publisher.publishPaymentFailed({
            tenantId: params.tenantId,
            paymentId: params.financePaymentId,
            reason: params.reason,
        });
        this.logger.log(`Payment failure handled — financePaymentId=${params.financePaymentId}`);
    }
};
exports.PaymentOrchestratorService = PaymentOrchestratorService;
__decorate([
    (0, event_emitter_1.OnEvent)(payment_events_1.PaymentEvents.CAPTURED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentOrchestratorService.prototype, "onPaymentCaptured", null);
__decorate([
    (0, event_emitter_1.OnEvent)(booking_events_1.BookingEvents.CANCELLED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentOrchestratorService.prototype, "onBookingCancelled", null);
exports.PaymentOrchestratorService = PaymentOrchestratorService = PaymentOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [gateway_registry_service_1.GatewayRegistry,
        payment_service_1.PaymentService,
        booking_service_1.BookingService,
        redis_event_bus_publisher_1.RedisEventBusPublisher,
        config_1.ConfigService,
        typeorm_2.DataSource])
], PaymentOrchestratorService);
//# sourceMappingURL=payment-orchestrator.service.js.map
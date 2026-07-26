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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const booking_guard_1 = require("../booking/guards/booking.guard");
const audit_interceptor_1 = require("../../common/interceptors/audit.interceptor");
const guest_session_service_1 = require("./guest-session.service");
const payment_orchestrator_service_1 = require("../payment/services/payment-orchestrator.service");
const guest_booking_linking_service_1 = require("./guest-booking-linking.service");
const booking_service_1 = require("../booking/services/booking.service");
const booking_authorization_service_1 = require("../booking/services/booking-authorization.service");
const qr_generation_service_1 = require("../qr/services/qr-generation.service");
const guest_dto_1 = require("./dto/guest.dto");
let GuestController = class GuestController {
    constructor(guestSessionService, linkingService, bookingService, authzService, qrGenerationService, paymentOrchestrator) {
        this.guestSessionService = guestSessionService;
        this.linkingService = linkingService;
        this.bookingService = bookingService;
        this.authzService = authzService;
        this.qrGenerationService = qrGenerationService;
        this.paymentOrchestrator = paymentOrchestrator;
    }
    issueGuestSession(_dto, tenant, req) {
        const clientIp = req.headers['x-forwarded-for']
            ?? req.socket.remoteAddress
            ?? undefined;
        return this.guestSessionService.issue(tenant.tenantId, clientIp);
    }
    async createGuestBooking(dto, tenant, req) {
        this.guestSessionService.validate(dto.guestSession, tenant.tenantId);
        const booking = await this.bookingService.create({
            slotIds: dto.slotIds,
            branchId: dto.branchId,
            courtId: dto.courtId,
            sportId: dto.sportId,
            customer: {
                name: dto.customer.name,
                email: dto.customer.email,
                phone: dto.customer.phone,
                isMember: false,
            },
            channel: 'walk_in',
            participantCount: dto.participantCount,
            customerNotes: dto.customerNotes,
            metadata: {
                guestBooking: true,
                ...(dto.metadata ?? {}),
            },
        }, tenant.tenantId, 'guest');
        let qr = null;
        try {
            qr = await this.qrGenerationService.issue({ bookingId: booking.id }, tenant.tenantId, 'guest');
        }
        catch {
        }
        const guestLookupToken = this.guestSessionService.issueGuestLookupToken({
            bookingId: booking.id,
            customerEmail: dto.customer.email,
            tenantId: tenant.tenantId,
        });
        const guestPaymentToken = this.guestSessionService.issueGuestPaymentToken({
            bookingId: booking.id,
            customerEmail: dto.customer.email,
            tenantId: tenant.tenantId,
            amountMinor: booking.finalPriceMinor ?? 0,
            currency: booking.currency ?? 'GBP',
        });
        return {
            booking,
            qr,
            guestLookupToken,
            guestPaymentToken,
        };
    }
    async guestLookup(token, tenant) {
        const { bookingId } = this.guestSessionService.validateGuestLookupToken(token, tenant.tenantId);
        const booking = await this.bookingService.findOne(bookingId, tenant.tenantId);
        return {
            id: booking.id,
            reference: booking.reference,
            status: booking.status,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            totalDurationMins: booking.totalDurationMins,
            finalPriceMinor: booking.finalPriceMinor,
            currency: booking.currency,
            courtId: booking.courtId,
            customerName: booking.customerName,
        };
    }
    async initiateGuestPayment(dto, tenant, req) {
        const claims = this.guestSessionService.validateGuestPaymentToken(dto.guestPaymentToken, tenant.tenantId);
        if (claims.bid !== dto.bookingId) {
            throw new common_1.UnauthorizedException('Guest payment token does not match booking');
        }
        const booking = await this.bookingService.findOne(dto.bookingId, tenant.tenantId);
        if (booking.customerEmail.toLowerCase() !== claims.em) {
            new common_1.Logger('GuestController').warn(`Guest payment email mismatch — token em masked booking masked tenant=${tenant.tenantId}`);
            throw new common_1.UnauthorizedException('Guest payment token does not match booking');
        }
        if ((booking.finalPriceMinor ?? 0) !== claims.amt ||
            (booking.currency ?? 'GBP').toLowerCase() !== claims.cur) {
            throw new common_1.UnauthorizedException('Guest payment token amount mismatch');
        }
        const ip = req.headers['x-forwarded-for']
            ?? req.socket.remoteAddress
            ?? undefined;
        return this.paymentOrchestrator.initiateForBooking({
            tenantId: tenant.tenantId,
            bookingId: booking.id,
            branchId: dto.branchId,
            amountMinor: claims.amt,
            currency: claims.cur.toUpperCase(),
            customerEmail: claims.em,
            actorId: `guest:${claims.jti}`,
            ipAddress: ip,
        });
    }
    linkGuestBookings(dto, tenant, actor) {
        if (!actor.userId)
            return { linked: 0 };
        return this.linkingService.linkGuestBookings({
            userId: actor.userId,
            customerEmail: dto.customerEmail,
            tenantId: tenant.tenantId,
        });
    }
};
exports.GuestController = GuestController;
__decorate([
    (0, common_1.Post)('session'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guest_dto_1.GuestSessionDto, Object, Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "issueGuestSession", null);
__decorate([
    (0, common_1.Post)('bookings'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guest_dto_1.GuestCreateBookingDto, Object, Object]),
    __metadata("design:returntype", Promise)
], GuestController.prototype, "createGuestBooking", null);
__decorate([
    (0, common_1.Get)('lookup/:token'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GuestController.prototype, "guestLookup", null);
__decorate([
    (0, common_1.Post)('payments/initiate'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guest_dto_1.GuestInitiatePaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], GuestController.prototype, "initiateGuestPayment", null);
__decorate([
    (0, common_1.Post)('link-bookings'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('PLAYER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guest_dto_1.LinkGuestBookingsDto, Object, Object]),
    __metadata("design:returntype", void 0)
], GuestController.prototype, "linkGuestBookings", null);
exports.GuestController = GuestController = __decorate([
    (0, common_1.Controller)('guest'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [guest_session_service_1.GuestSessionService,
        guest_booking_linking_service_1.GuestBookingLinkingService,
        booking_service_1.BookingService,
        booking_authorization_service_1.BookingAuthorizationService,
        qr_generation_service_1.QrGenerationService,
        payment_orchestrator_service_1.PaymentOrchestratorService])
], GuestController);
//# sourceMappingURL=guest.controller.js.map
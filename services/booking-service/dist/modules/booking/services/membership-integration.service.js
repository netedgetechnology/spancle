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
var MembershipIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const membership_service_1 = require("../../membership/services/membership.service");
const entitlement_service_1 = require("../../membership/services/entitlement.service");
let MembershipIntegrationService = MembershipIntegrationService_1 = class MembershipIntegrationService {
    constructor(membershipService, entitlementService, ds) {
        this.membershipService = membershipService;
        this.entitlementService = entitlementService;
        this.ds = ds;
        this.logger = new common_1.Logger(MembershipIntegrationService_1.name);
    }
    async validateAndComputePrice(params) {
        const { dto, tenantId, slotPriceMinor } = params;
        if (!dto.customer.userId || !dto.customer.isMember) {
            return { context: null, adjustedPriceMinor: null, discountMinor: 0, shouldConsumeCredit: false };
        }
        const status = await this.membershipService.getMembershipStatus(dto.customer.userId, tenantId);
        if (!status.isMember || !status.membershipId) {
            return { context: null, adjustedPriceMinor: null, discountMinor: 0, shouldConsumeCredit: false };
        }
        const membership = await this.membershipService.findActiveByUser(dto.customer.userId, tenantId);
        if (membership) {
            this.validateMembershipScope(membership.benefitSnapshot ?? [], {
                branchId: params.branchId,
                sportId: params.sportId,
                courtId: params.courtId,
            });
        }
        const context = {
            membershipId: status.membershipId,
            membershipStatus: status.membershipStatus ?? 'active',
            membershipTier: status.membershipTier,
            discountEligible: status.discountEligible,
            courtCreditsRemaining: status.courtCreditsRemaining,
        };
        let adjustedPriceMinor = slotPriceMinor;
        let discountMinor = 0;
        let shouldConsumeCredit = false;
        if (status.courtCreditsRemaining > 0) {
            adjustedPriceMinor = 0;
            discountMinor = slotPriceMinor ?? 0;
            shouldConsumeCredit = true;
        }
        else if (status.discountEligible && slotPriceMinor != null) {
            const discount = this.resolveDiscount(membership?.benefitSnapshot ?? [], slotPriceMinor);
            adjustedPriceMinor = slotPriceMinor - discount;
            discountMinor = discount;
        }
        return { context, adjustedPriceMinor, discountMinor, shouldConsumeCredit };
    }
    async consumeEntitlement(params) {
        const { booking, tenantId, actorId } = params;
        if (!booking.membershipId || !booking.entitlementType) {
            return null;
        }
        try {
            const balance = await this.entitlementService.consume(booking.membershipId, {
                benefitType: booking.entitlementType,
                quantity: 1,
                referenceType: 'booking',
                referenceId: booking.id,
                note: `Booking ${booking.reference} confirmed`,
            }, tenantId, actorId);
            this.logger.log(`Entitlement consumed — booking=${booking.reference} ` +
                `type=${booking.entitlementType} remaining=${balance.balance}`);
            return balance.id;
        }
        catch (err) {
            this.logger.warn(`consumeEntitlement failed for booking=${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async restoreEntitlement(params) {
        const { booking, tenantId, actorId } = params;
        if (booking.membershipId && booking.entitlementType && booking.entitlementTxnId) {
            try {
                await this.entitlementService.refund(booking.membershipId, {
                    benefitType: booking.entitlementType,
                    quantity: 1,
                    originalTransactionId: booking.entitlementTxnId,
                    note: `Booking ${booking.reference} cancelled — entitlement restored`,
                }, tenantId, actorId);
                this.logger.log(`Entitlement restored — booking=${booking.reference} type=${booking.entitlementType}`);
            }
            catch (err) {
                this.logger.warn(`restoreEntitlement failed for booking=${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        if (booking.walletAmountMinor > 0 && booking.customerId) {
            await this.refundToWallet({
                customerId: booking.customerId,
                tenantId,
                amountMinor: booking.walletAmountMinor,
                bookingRef: booking.reference,
            });
        }
    }
    async applyWalletPayment(params) {
        const { customerId, tenantId, amountMinor, bookingRef } = params;
        if (amountMinor <= 0)
            return;
        await this.ds.transaction(async (manager) => {
            const [row] = await manager.query(`SELECT wallet_balance_minor FROM customers WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, [customerId, tenantId]);
            if (!row)
                throw new common_1.BadRequestException(`Customer ${customerId} not found`);
            if (row.wallet_balance_minor < amountMinor) {
                throw new common_1.BadRequestException(`Insufficient wallet balance: ${row.wallet_balance_minor} < ${amountMinor}`);
            }
            await manager.query(`UPDATE customers SET wallet_balance_minor = wallet_balance_minor - $1,
         updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [amountMinor, customerId, tenantId]);
        });
        this.logger.log(`Wallet payment applied — customer=${customerId} amount=${amountMinor} booking=${bookingRef}`);
    }
    async refundToWallet(params) {
        const { customerId, tenantId, amountMinor, bookingRef } = params;
        if (amountMinor <= 0)
            return;
        try {
            await this.ds.query(`UPDATE customers SET wallet_balance_minor = wallet_balance_minor + $1,
         updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [amountMinor, customerId, tenantId]);
            this.logger.log(`Wallet refunded — customer=${customerId} amount=${amountMinor} booking=${bookingRef}`);
        }
        catch (err) {
            this.logger.warn(`refundToWallet failed for booking=${bookingRef}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    validateMembershipScope(snapshot, booking) {
        for (const benefit of snapshot) {
            const allowed = benefit['allowedBranchIds'];
            if (allowed?.length && !allowed.includes(booking.branchId)) {
                throw new common_1.BadRequestException('Your membership is not valid for this branch');
            }
            const allowedSports = benefit['allowedSportIds'];
            if (allowedSports?.length && booking.sportId && !allowedSports.includes(booking.sportId)) {
                throw new common_1.BadRequestException('Your membership is not valid for this sport');
            }
            const allowedCourts = benefit['allowedCourtIds'];
            if (allowedCourts?.length && !allowedCourts.includes(booking.courtId)) {
                throw new common_1.BadRequestException('Your membership is not valid for this court');
            }
        }
    }
    resolveDiscount(snapshot, slotPriceMinor) {
        for (const b of snapshot) {
            const type = String(b['benefitType'] ?? '');
            if (type === 'booking_discount_pct') {
                const pct = Number(b['value'] ?? 0);
                return Math.round(slotPriceMinor * (pct / 100));
            }
            if (type === 'booking_discount_fixed') {
                return Math.min(Number(b['value'] ?? 0), slotPriceMinor);
            }
        }
        return 0;
    }
};
exports.MembershipIntegrationService = MembershipIntegrationService;
exports.MembershipIntegrationService = MembershipIntegrationService = MembershipIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [membership_service_1.MembershipService,
        entitlement_service_1.EntitlementService,
        typeorm_2.DataSource])
], MembershipIntegrationService);
//# sourceMappingURL=membership-integration.service.js.map
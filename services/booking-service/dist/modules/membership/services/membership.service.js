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
var MembershipService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const membership_repository_1 = require("../repositories/membership.repository");
const membership_plan_repository_1 = require("../repositories/membership-plan.repository");
const membership_events_1 = require("../events/membership.events");
const entitlement_service_1 = require("./entitlement.service");
const ALLOWED_TRANSITIONS = {
    trial: ['active', 'expired', 'cancelled'],
    pending_payment: ['active', 'expired', 'cancelled'],
    active: ['frozen', 'pending_renewal', 'cancellation_pending', 'suspended', 'upgraded'],
    frozen: ['active', 'cancelled'],
    pending_renewal: ['active', 'payment_failed', 'expired'],
    payment_failed: ['pending_renewal', 'expired', 'active'],
    cancellation_pending: ['cancelled', 'active'],
    suspended: ['active', 'cancelled'],
    upgraded: [],
    downgraded: [],
    expired: [],
    cancelled: [],
};
const TERMINAL = ['upgraded', 'downgraded', 'expired', 'cancelled'];
function isTerminal(status) {
    return TERMINAL.includes(status);
}
function generateMemberNumber() {
    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '0123456789';
    const rand = (chars) => chars[Math.floor(Math.random() * chars.length)];
    return `MBR-${rand(alpha)}${rand(alpha)}${rand(digits)}${rand(digits)}${rand(digits)}${rand(digits)}`;
}
let MembershipService = MembershipService_1 = class MembershipService {
    constructor(membershipRepository, planRepository, eventEmitter, entitlementService) {
        this.membershipRepository = membershipRepository;
        this.planRepository = planRepository;
        this.eventEmitter = eventEmitter;
        this.entitlementService = entitlementService;
        this.logger = new common_1.Logger(MembershipService_1.name);
    }
    assertTransitionAllowed(from, to) {
        const allowed = ALLOWED_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException(`Cannot transition membership from "${from}" to "${to}". ` +
                `Allowed: [${allowed.join(', ') || 'none'}]`);
        }
    }
    async logTransition(params) {
        await this.membershipRepository.insertAuditLog({
            tenantId: params.tenantId,
            membershipId: params.membershipId,
            action: params.action,
            actorId: params.actorId,
            actorType: params.actorType,
            previousStatus: params.previousStatus,
            newStatus: params.newStatus,
            note: params.note ?? null,
            diff: params.diff ?? null,
        });
    }
    emitStatusChanged(tenantId, membershipId, userId, actorId, previousStatus, newStatus) {
        return this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.STATUS_CHANGED, {
            tenantId, membershipId, userId, actorId,
            previousStatus, newStatus,
            timestamp: new Date().toISOString(),
        });
    }
    async enrol(dto, tenantId, actorId) {
        const plan = await this.planRepository.findByIdOrFail(dto.planId, tenantId);
        if (!plan.isActive) {
            throw new common_1.UnprocessableEntityException('Membership plan is not accepting new enrolments');
        }
        if (dto.userId) {
            const existing = await this.membershipRepository.findActiveByUser(dto.userId, tenantId);
            if (existing) {
                throw new common_1.ConflictException(`User already has an active membership (${existing.memberNumber})`);
            }
        }
        let memberNumber = generateMemberNumber();
        for (let i = 0; i < 5; i++) {
            const collision = await this.membershipRepository.findByMemberNumber(memberNumber, tenantId);
            if (!collision)
                break;
            memberNumber = generateMemberNumber();
        }
        const benefits = await this.planRepository.findBenefits(plan.id, tenantId);
        const benefitSnapshot = benefits.map((b) => ({
            benefitType: b.benefitType,
            unitsPerPeriod: b.unitsPerPeriod,
            periodType: b.periodType,
            resetDay: b.resetDay,
            rolloverAllowed: b.rolloverAllowed,
            maxRolloverUnits: b.maxRolloverUnits,
            transferable: b.transferable,
            expiresWithMembership: b.expiresWithMembership,
        }));
        const initialStatus = plan.trialDays > 0 ? 'trial' : 'pending_payment';
        const now = new Date();
        const trialEndsAt = plan.trialDays > 0
            ? new Date(now.getTime() + plan.trialDays * 86_400_000)
            : null;
        const membership = await this.membershipRepository.create({
            tenantId,
            planId: plan.id,
            userId: dto.userId ?? null,
            membershipType: dto.membershipType ?? plan.membershipType,
            memberNumber,
            status: initialStatus,
            benefitSnapshot,
            currency: plan.currency,
            priceMinor: plan.priceMinor,
            autoRenew: dto.autoRenew ?? plan.autoRenew,
            enrolledAt: now,
            trialEndsAt,
            parentMembershipId: dto.parentMembershipId ?? null,
            seatLabel: dto.seatLabel ?? null,
            createdById: actorId,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId,
            membershipId: membership.id,
            action: 'enrolled',
            actorId,
            actorType: 'user',
            previousStatus: null,
            newStatus: initialStatus,
            note: dto.notes,
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENROLLED, {
            tenantId,
            membershipId: membership.id,
            userId: membership.userId,
            actorId,
            timestamp: now.toISOString(),
        });
        for (const benefit of benefitSnapshot) {
            try {
                await this.entitlementService.initialise(membership.id, tenantId, {
                    benefitType: String(benefit['benefitType'] ?? ''),
                    units: Number(benefit['unitsPerPeriod'] ?? 0),
                    periodType: benefit['periodType'] ? String(benefit['periodType']) : undefined,
                    rolloverAllowed: benefit['rolloverAllowed'] ? 1 : 0,
                    maxRolloverUnits: benefit['maxRolloverUnits'] != null
                        ? Number(benefit['maxRolloverUnits'])
                        : undefined,
                });
            }
            catch (err) {
                this.logger.warn(`Entitlement provision failed for benefit "${benefit['benefitType']}" ` +
                    `on membership ${membership.id}: ${err.message}`);
            }
        }
        this.logger.log(`Enrolled ${membership.memberNumber} on plan "${plan.name}" — tenant: ${tenantId}`);
        return membership;
    }
    async findAll(tenantId, query) {
        return this.membershipRepository.query({ tenantId, ...query });
    }
    async findOne(id, tenantId) {
        return this.membershipRepository.findByIdOrFail(id, tenantId);
    }
    async findActiveByUser(userId, tenantId) {
        return this.membershipRepository.findActiveByUser(userId, tenantId);
    }
    async findTransactions(membershipId, tenantId, limit = 50, offset = 0) {
        await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        return this.membershipRepository.findTransactions(membershipId, tenantId, limit, offset);
    }
    async activate(id, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        const prev = m.status;
        this.assertTransitionAllowed(prev, 'active');
        const plan = await this.planRepository.findByIdOrFail(m.planId, tenantId);
        const now = new Date();
        let renewsAt = null;
        if (plan.billingCycle !== 'lifetime') {
            const ms = {
                monthly: 30,
                quarterly: 90,
                annual: 365,
            };
            const days = ms[plan.billingCycle] ?? 30;
            renewsAt = new Date(now.getTime() + days * 86_400_000);
        }
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'active',
            activatedAt: now,
            renewsAt,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'activated',
            actorId, actorType: 'user', previousStatus: prev, newStatus: 'active',
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'active');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ACTIVATED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: now.toISOString(),
        });
        return updated;
    }
    async freeze(id, dto, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        const prev = m.status;
        this.assertTransitionAllowed(prev, 'frozen');
        const frozenUntil = new Date(dto.frozenUntil);
        if (frozenUntil <= new Date()) {
            throw new common_1.BadRequestException('frozenUntil must be a future date');
        }
        const freezeDays = Math.ceil((frozenUntil.getTime() - Date.now()) / 86_400_000);
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'frozen',
            frozenAt: new Date(),
            frozenUntil,
            totalFreezeDaysUsed: (m.totalFreezeDaysUsed ?? 0) + freezeDays,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'frozen',
            actorId, actorType: 'user', previousStatus: prev, newStatus: 'frozen',
            note: `Frozen until ${dto.frozenUntil}`,
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'frozen');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.FROZEN, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async unfreeze(id, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        this.assertTransitionAllowed(m.status, 'active');
        if (m.status !== 'frozen') {
            throw new common_1.BadRequestException('Membership is not frozen');
        }
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'active',
            frozenAt: null,
            frozenUntil: null,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'unfrozen',
            actorId, actorType: 'user', previousStatus: 'frozen', newStatus: 'active',
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, 'frozen', 'active');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.UNFROZEN, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async cancel(id, dto, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        const prev = m.status;
        if (isTerminal(prev)) {
            throw new common_1.BadRequestException(`Membership is already in terminal state "${prev}" and cannot be cancelled`);
        }
        const newStatus = dto.immediate
            ? 'cancelled'
            : 'cancellation_pending';
        this.assertTransitionAllowed(prev, newStatus);
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: newStatus,
            cancelledAt: dto.immediate ? new Date() : null,
            cancellationReason: dto.reason ?? null,
            updatedById: actorId,
        });
        const action = dto.immediate ? 'cancelled' : 'cancellation_scheduled';
        await this.logTransition({
            tenantId, membershipId: id, action,
            actorId, actorType: 'user', previousStatus: prev, newStatus,
            note: dto.reason,
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, newStatus);
        const event = dto.immediate
            ? membership_events_1.MembershipEvents.CANCELLED
            : membership_events_1.MembershipEvents.CANCELLATION_SCHEDULED;
        await this.eventEmitter.emitAsync(event, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        if (dto.immediate) {
            await this.entitlementService.deactivateAll(id, tenantId, actorId).catch((err) => {
                this.logger.warn(`cancel: entitlement deactivation failed for ${id}: ${err.message}`);
            });
        }
        return updated;
    }
    async suspend(id, tenantId, actorId, note) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        this.assertTransitionAllowed(m.status, 'suspended');
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'suspended', updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'suspended',
            actorId, actorType: 'staff', previousStatus: m.status, newStatus: 'suspended', note,
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, m.status, 'suspended');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.SUSPENDED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        await this.entitlementService.deactivateAll(id, tenantId, actorId).catch((err) => {
            this.logger.warn(`suspend: entitlement deactivation failed for ${id}: ${err.message}`);
        });
        return updated;
    }
    async restore(id, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        if (m.status !== 'suspended') {
            throw new common_1.BadRequestException('Membership is not suspended');
        }
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'active', updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'restored',
            actorId, actorType: 'staff', previousStatus: 'suspended', newStatus: 'active',
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, 'suspended', 'active');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.RESTORED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async scheduleDowngrade(id, dto, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        if (m.status !== 'active') {
            throw new common_1.BadRequestException('Only active memberships can be scheduled for downgrade');
        }
        await this.planRepository.findByIdOrFail(dto.targetPlanId, tenantId);
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            pendingDowngradePlanId: dto.targetPlanId,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'downgrade_scheduled',
            actorId, actorType: 'user', previousStatus: m.status, newStatus: m.status,
            note: `Target plan: ${dto.targetPlanId}`,
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.DOWNGRADE_SCHEDULED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async update(id, dto, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        if (isTerminal(m.status)) {
            throw new common_1.BadRequestException(`Cannot modify a membership in terminal state "${m.status}"`);
        }
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            ...(dto.autoRenew !== undefined && { autoRenew: dto.autoRenew }),
            ...(dto.seatLabel !== undefined && { seatLabel: dto.seatLabel }),
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'updated',
            actorId, actorType: 'staff', previousStatus: m.status, newStatus: m.status,
        });
        return updated;
    }
    async assignUser(id, dto, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        if (m.membershipType !== 'corporate') {
            throw new common_1.BadRequestException('assignUser is only valid on corporate memberships');
        }
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            userId: dto.userId,
            seatLabel: dto.seatLabel ?? m.seatLabel,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'user_assigned',
            actorId, actorType: 'staff', previousStatus: m.status, newStatus: m.status,
            note: `Assigned userId ${dto.userId}`,
        });
        return updated;
    }
    async expire(id, tenantId, actorId, actorType = 'system') {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        const prev = m.status;
        this.assertTransitionAllowed(prev, 'expired');
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'expired',
            expiresAt: new Date(),
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'expired',
            actorId, actorType, previousStatus: prev, newStatus: 'expired',
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'expired');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.EXPIRED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        await this.entitlementService.deactivateAll(id, tenantId, actorId).catch((err) => {
            this.logger.warn(`expire: entitlement deactivation failed for ${id}: ${err.message}`);
        });
        this.logger.log(`Membership ${m.memberNumber} expired (${prev} → expired) — tenant: ${tenantId}`);
        return updated;
    }
    async renew(id, tenantId, actorId, actorType = 'system') {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        const prev = m.status;
        this.assertTransitionAllowed(prev, 'active');
        const plan = await this.planRepository.findByIdOrFail(m.planId, tenantId);
        const cycleMs = {
            monthly: 30 * 86_400_000,
            quarterly: 90 * 86_400_000,
            annual: 365 * 86_400_000,
        };
        const now = new Date();
        const base = m.renewsAt && m.renewsAt > now ? m.renewsAt : now;
        const interval = cycleMs[plan.billingCycle];
        const renewsAt = interval ? new Date(base.getTime() + interval) : null;
        const updated = await this.membershipRepository.updateById(id, tenantId, {
            status: 'active',
            renewsAt,
            expiresAt: null,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'renewed',
            actorId, actorType, previousStatus: prev, newStatus: 'active',
            note: renewsAt ? `Next renewal: ${renewsAt.toISOString()}` : 'Lifetime — no renewal',
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'active');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.RENEWED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: now.toISOString(),
        });
        return updated;
    }
    async upgrade(id, dto, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        if (isTerminal(m.status)) {
            throw new common_1.BadRequestException(`Cannot upgrade a membership in terminal state "${m.status}"`);
        }
        if (m.planId === dto.targetPlanId) {
            throw new common_1.BadRequestException('Target plan is the same as the current plan');
        }
        const targetPlan = await this.planRepository.findByIdOrFail(dto.targetPlanId, tenantId);
        if (!targetPlan.isActive) {
            throw new common_1.BadRequestException('Target plan is not active');
        }
        const prev = m.status;
        const previous = await this.membershipRepository.updateById(id, tenantId, {
            status: 'upgraded',
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'upgraded',
            actorId, actorType: 'user', previousStatus: prev, newStatus: 'upgraded',
            note: `Upgraded to plan ${dto.targetPlanId}`,
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'upgraded');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.UPGRADED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        const next = await this.enrol({
            planId: dto.targetPlanId,
            userId: m.userId ?? undefined,
            membershipType: targetPlan.membershipType,
            autoRenew: m.autoRenew,
            parentMembershipId: m.parentMembershipId ?? undefined,
            seatLabel: m.seatLabel ?? undefined,
        }, tenantId, actorId);
        return { previous, next };
    }
    async executeDowngrade(id, tenantId, actorId) {
        const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
        if (m.status !== 'active') {
            throw new common_1.BadRequestException('Downgrade can only execute on an active membership');
        }
        if (!m.pendingDowngradePlanId) {
            throw new common_1.BadRequestException('Membership has no pending downgrade');
        }
        const targetPlan = await this.planRepository.findByIdOrFail(m.pendingDowngradePlanId, tenantId);
        const previous = await this.membershipRepository.updateById(id, tenantId, {
            status: 'downgraded',
            pendingDowngradePlanId: null,
            updatedById: actorId,
        });
        await this.logTransition({
            tenantId, membershipId: id, action: 'downgraded',
            actorId, actorType: 'system', previousStatus: 'active', newStatus: 'downgraded',
            note: `Downgraded to plan ${m.pendingDowngradePlanId}`,
        });
        await this.emitStatusChanged(tenantId, id, m.userId, actorId, 'active', 'downgraded');
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.DOWNGRADED, {
            tenantId, membershipId: id, userId: m.userId, actorId,
            timestamp: new Date().toISOString(),
        });
        const next = await this.enrol({
            planId: m.pendingDowngradePlanId,
            userId: m.userId ?? undefined,
            membershipType: targetPlan.membershipType,
            autoRenew: m.autoRenew,
            parentMembershipId: m.parentMembershipId ?? undefined,
            seatLabel: m.seatLabel ?? undefined,
        }, tenantId, actorId);
        return { previous, next };
    }
    async getMembershipStatus(userId, tenantId) {
        const NON_MEMBER = {
            isMember: false,
            membershipId: null,
            membershipTier: null,
            membershipType: null,
            membershipStatus: null,
            priorityBookingHoursAhead: 0,
            courtCreditsRemaining: 0,
            coachCreditsRemaining: 0,
            guestPassesRemaining: 0,
            tournamentCreditsRemaining: 0,
            cafeCreditMinor: 0,
            lockerAccess: false,
            parkingAccess: false,
            discountEligible: false,
        };
        const membership = await this.membershipRepository.findActiveByUser(userId, tenantId);
        if (!membership)
            return NON_MEMBER;
        const isActive = membership.status === 'active' || membership.status === 'trial';
        if (!isActive) {
            return { ...NON_MEMBER, membershipStatus: membership.status };
        }
        const plan = await this.planRepository.findById(membership.planId, tenantId);
        const balances = await this.entitlementService.findAll(membership.id, tenantId);
        const get = (type) => {
            const b = balances.find((x) => x.benefitType === type);
            return b ? Math.max(0, b.balance - b.reservedUnits) : 0;
        };
        const hasDiscount = (membership.benefitSnapshot ?? []).some((b) => ['booking_discount_pct', 'booking_discount_fixed'].includes(String(b['benefitType'] ?? '')));
        const priorityBalance = balances.find((b) => b.benefitType === 'priority_booking_hours');
        return {
            isMember: true,
            membershipId: membership.id,
            membershipTier: plan?.slug ?? null,
            membershipType: membership.membershipType,
            membershipStatus: membership.status,
            priorityBookingHoursAhead: priorityBalance
                ? Math.max(0, priorityBalance.balance - priorityBalance.reservedUnits)
                : 0,
            courtCreditsRemaining: get('court_credit'),
            coachCreditsRemaining: get('coaching_credit'),
            guestPassesRemaining: get('guest_pass'),
            tournamentCreditsRemaining: get('tournament_credit'),
            cafeCreditMinor: get('cafe_credit'),
            lockerAccess: get('locker_access') > 0,
            parkingAccess: get('parking_access') > 0,
            discountEligible: hasDiscount,
        };
    }
    async autoExpireTrials() {
        const batchSize = 50;
        const candidates = await this.membershipRepository.findExpiredTrials(batchSize);
        let count = 0;
        for (const m of candidates) {
            try {
                await this.expire(m.id, m.tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoExpireTrials: ${m.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoExpireTrials: expired ${count} trial(s)`);
        return count;
    }
    async autoExpireGrace() {
        const batchSize = 50;
        const candidates = await this.membershipRepository.findGraceExpired(batchSize);
        let count = 0;
        for (const m of candidates) {
            try {
                await this.expire(m.id, m.tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoExpireGrace: ${m.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoExpireGrace: expired ${count} membership(s)`);
        return count;
    }
    async autoRequestRenewals(leadDays) {
        const batchSize = 50;
        const candidates = await this.membershipRepository.findDueForRenewal(leadDays, batchSize);
        let count = 0;
        for (const m of candidates) {
            try {
                const updated = await this.membershipRepository.updateById(m.id, m.tenantId, {
                    status: 'pending_renewal',
                });
                await this.logTransition({
                    tenantId: m.tenantId, membershipId: m.id, action: 'pending_renewal',
                    actorId: 'system', actorType: 'system',
                    previousStatus: m.status, newStatus: 'pending_renewal',
                });
                await this.emitStatusChanged(m.tenantId, m.id, m.userId, 'system', m.status, 'pending_renewal');
                await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.RENEWAL_INVOICE_REQUESTED, {
                    tenantId: m.tenantId, membershipId: m.id, userId: m.userId,
                    actorId: 'system', timestamp: new Date().toISOString(),
                });
                void updated;
                count++;
            }
            catch (err) {
                this.logger.warn(`autoRequestRenewals: ${m.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoRequestRenewals: queued ${count} renewal(s)`);
        return count;
    }
    async autoLiftFreezes() {
        const batchSize = 50;
        const candidates = await this.membershipRepository.findFreezeExpired(batchSize);
        let count = 0;
        for (const m of candidates) {
            try {
                const freezeMs = m.frozenUntil && m.frozenAt
                    ? m.frozenUntil.getTime() - m.frozenAt.getTime()
                    : 0;
                const renewsAt = m.renewsAt
                    ? new Date(m.renewsAt.getTime() + freezeMs)
                    : null;
                await this.membershipRepository.updateById(m.id, m.tenantId, {
                    status: 'active',
                    frozenAt: null,
                    frozenUntil: null,
                    renewsAt,
                });
                await this.logTransition({
                    tenantId: m.tenantId, membershipId: m.id, action: 'unfrozen',
                    actorId: 'system', actorType: 'system',
                    previousStatus: 'frozen', newStatus: 'active',
                    note: `Auto-unfrozen; renewsAt extended to ${renewsAt?.toISOString() ?? 'unchanged'}`,
                });
                await this.emitStatusChanged(m.tenantId, m.id, m.userId, 'system', 'frozen', 'active');
                await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.UNFROZEN, {
                    tenantId: m.tenantId, membershipId: m.id, userId: m.userId,
                    actorId: 'system', timestamp: new Date().toISOString(),
                });
                count++;
            }
            catch (err) {
                this.logger.warn(`autoLiftFreezes: ${m.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoLiftFreezes: unfrozen ${count} membership(s)`);
        return count;
    }
    async autoExecuteDowngrades() {
        const batchSize = 50;
        const candidates = await this.membershipRepository.findPendingDowngrades(batchSize);
        let count = 0;
        for (const m of candidates) {
            try {
                await this.executeDowngrade(m.id, m.tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoExecuteDowngrades: ${m.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoExecuteDowngrades: executed ${count} downgrade(s)`);
        return count;
    }
    async autoFinaliseCancellations() {
        const batchSize = 50;
        const candidates = await this.membershipRepository.findPendingCancellations(batchSize);
        let count = 0;
        for (const m of candidates) {
            try {
                await this.membershipRepository.updateById(m.id, m.tenantId, {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                });
                await this.logTransition({
                    tenantId: m.tenantId, membershipId: m.id, action: 'cancelled',
                    actorId: 'system', actorType: 'system',
                    previousStatus: 'cancellation_pending', newStatus: 'cancelled',
                });
                await this.emitStatusChanged(m.tenantId, m.id, m.userId, 'system', 'cancellation_pending', 'cancelled');
                await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.CANCELLED, {
                    tenantId: m.tenantId, membershipId: m.id, userId: m.userId,
                    actorId: 'system', timestamp: new Date().toISOString(),
                });
                count++;
            }
            catch (err) {
                this.logger.warn(`autoFinaliseCancellations: ${m.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoFinaliseCancellations: cancelled ${count} membership(s)`);
        return count;
    }
};
exports.MembershipService = MembershipService;
exports.MembershipService = MembershipService = MembershipService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => entitlement_service_1.EntitlementService))),
    __metadata("design:paramtypes", [membership_repository_1.MembershipRepository,
        membership_plan_repository_1.MembershipPlanRepository,
        event_emitter_1.EventEmitter2,
        entitlement_service_1.EntitlementService])
], MembershipService);
//# sourceMappingURL=membership.service.js.map
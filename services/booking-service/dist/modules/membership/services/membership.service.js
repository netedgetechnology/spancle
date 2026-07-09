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
var MembershipService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const membership_repository_1 = require("../repositories/membership.repository");
const membership_plan_repository_1 = require("../repositories/membership-plan.repository");
const membership_events_1 = require("../events/membership.events");
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
    constructor(membershipRepository, planRepository, eventEmitter) {
        this.membershipRepository = membershipRepository;
        this.planRepository = planRepository;
        this.eventEmitter = eventEmitter;
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
};
exports.MembershipService = MembershipService;
exports.MembershipService = MembershipService = MembershipService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [membership_repository_1.MembershipRepository,
        membership_plan_repository_1.MembershipPlanRepository,
        event_emitter_1.EventEmitter2])
], MembershipService);
//# sourceMappingURL=membership.service.js.map
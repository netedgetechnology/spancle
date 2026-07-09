import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 }        from '@nestjs/event-emitter';
import { MembershipRepository }     from '../repositories/membership.repository';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';
import {
  MembershipEvents,
  type MembershipStatusChangedPayload,
} from '../events/membership.events';
import type { MembershipEntity, MembershipStatus } from '../entities/membership.entity';
import type { MembershipTransactionEntity }         from '../entities/membership-transaction.entity';
import type { CreateMembershipDto }                 from '../dto/create-membership.dto';
import type {
  FreezeMembershipDto,
  CancelMembershipDto,
  UpgradeMembershipDto,
  ScheduleDowngradeDto,
  UpdateMembershipDto,
  AssignUserDto,
} from '../dto/update-membership.dto';
import { EntitlementService } from './entitlement.service';
import type { MembershipStatusDto } from '../dto/membership-status.dto';

const ALLOWED_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  trial:                ['active', 'expired', 'cancelled'],
  pending_payment:      ['active', 'expired', 'cancelled'],
  active:               ['frozen', 'pending_renewal', 'cancellation_pending', 'suspended', 'upgraded'],
  frozen:               ['active', 'cancelled'],
  pending_renewal:      ['active', 'payment_failed', 'expired'],
  payment_failed:       ['pending_renewal', 'expired', 'active'],
  cancellation_pending: ['cancelled', 'active'],
  suspended:            ['active', 'cancelled'],
  upgraded:             [],
  downgraded:           [],
  expired:              [],
  cancelled:            [],
};

const TERMINAL: MembershipStatus[] = ['upgraded', 'downgraded', 'expired', 'cancelled'];

function isTerminal(status: MembershipStatus): boolean {
  return TERMINAL.includes(status);
}

// ── Member-number generation ──────────────────────────────────────────────────

function generateMemberNumber(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const rand = (chars: string): string =>
    chars[Math.floor(Math.random() * chars.length)]!;
  // MBR-LLNNNN  (L=letter, N=digit)
  return `MBR-${rand(alpha)}${rand(alpha)}${rand(digits)}${rand(digits)}${rand(digits)}${rand(digits)}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly planRepository:       MembershipPlanRepository,
    private readonly eventEmitter:         EventEmitter2,
    @Inject(forwardRef(() => EntitlementService))
    private readonly entitlementService:   EntitlementService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertTransitionAllowed(
    from: MembershipStatus,
    to:   MembershipStatus,
  ): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition membership from "${from}" to "${to}". ` +
        `Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }

  private async logTransition(params: {
    tenantId:       string;
    membershipId:   string;
    action:         string;
    actorId:        string;
    actorType:      string;
    previousStatus: string | null;
    newStatus:      string | null;
    note?:          string;
    diff?:          Record<string, unknown>;
  }): Promise<void> {
    await this.membershipRepository.insertAuditLog({
      tenantId:       params.tenantId,
      membershipId:   params.membershipId,
      action:         params.action,
      actorId:        params.actorId,
      actorType:      params.actorType,
      previousStatus: params.previousStatus,
      newStatus:      params.newStatus,
      note:           params.note ?? null,
      diff:           params.diff ?? null,
    });
  }

  private emitStatusChanged(
    tenantId:       string,
    membershipId:   string,
    userId:         string | null,
    actorId:        string,
    previousStatus: string,
    newStatus:      string,
  ): Promise<unknown[]> {
    return this.eventEmitter.emitAsync(MembershipEvents.STATUS_CHANGED, {
      tenantId, membershipId, userId, actorId,
      previousStatus, newStatus,
      timestamp: new Date().toISOString(),
    } as MembershipStatusChangedPayload);
  }

  // ── Enrolment ─────────────────────────────────────────────────────────────

  async enrol(
    dto:      CreateMembershipDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const plan = await this.planRepository.findByIdOrFail(dto.planId, tenantId);

    if (!plan.isActive) {
      throw new UnprocessableEntityException('Membership plan is not accepting new enrolments');
    }

    // Prevent duplicate active membership for the same user
    if (dto.userId) {
      const existing = await this.membershipRepository.findActiveByUser(dto.userId, tenantId);
      if (existing) {
        throw new ConflictException(
          `User already has an active membership (${existing.memberNumber})`,
        );
      }
    }

    // Generate a unique member number (retry on collision)
    let memberNumber = generateMemberNumber();
    for (let i = 0; i < 5; i++) {
      const collision = await this.membershipRepository.findByMemberNumber(
        memberNumber,
        tenantId,
      );
      if (!collision) break;
      memberNumber = generateMemberNumber();
    }

    // Build benefit snapshot from plan benefits
    const benefits = await this.planRepository.findBenefits(plan.id, tenantId);
    const benefitSnapshot = benefits.map((b) => ({
      benefitType:          b.benefitType,
      unitsPerPeriod:       b.unitsPerPeriod,
      periodType:           b.periodType,
      resetDay:             b.resetDay,
      rolloverAllowed:      b.rolloverAllowed,
      maxRolloverUnits:     b.maxRolloverUnits,
      transferable:         b.transferable,
      expiresWithMembership: b.expiresWithMembership,
    }));

    const initialStatus: MembershipStatus = plan.trialDays > 0 ? 'trial' : 'pending_payment';
    const now   = new Date();
    const trialEndsAt = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 86_400_000)
      : null;

    const membership = await this.membershipRepository.create({
      tenantId,
      planId:            plan.id,
      userId:            dto.userId             ?? null,
      membershipType:    dto.membershipType      ?? plan.membershipType,
      memberNumber,
      status:            initialStatus,
      benefitSnapshot,
      currency:          plan.currency,
      priceMinor:        plan.priceMinor,
      autoRenew:         dto.autoRenew          ?? plan.autoRenew,
      enrolledAt:        now,
      trialEndsAt,
      parentMembershipId: dto.parentMembershipId ?? null,
      seatLabel:         dto.seatLabel           ?? null,
      createdById:       actorId,
      updatedById:       actorId,
    });

    await this.logTransition({
      tenantId,
      membershipId: membership.id,
      action:       'enrolled',
      actorId,
      actorType:    'user',
      previousStatus: null,
      newStatus:    initialStatus,
      note:         dto.notes,
    });

    await this.eventEmitter.emitAsync(MembershipEvents.ENROLLED, {
      tenantId,
      membershipId: membership.id,
      userId:       membership.userId,
      actorId,
      timestamp:    now.toISOString(),
    });

    // Provision entitlement balances from the benefit snapshot
    for (const benefit of benefitSnapshot) {
      try {
        await this.entitlementService.initialise(membership.id, tenantId, {
          benefitType:     String(benefit['benefitType']   ?? ''),
          units:           Number(benefit['unitsPerPeriod'] ?? 0),
          periodType:      benefit['periodType'] ? String(benefit['periodType']) : undefined,
          rolloverAllowed: benefit['rolloverAllowed'] ? 1 : 0,
          maxRolloverUnits: benefit['maxRolloverUnits'] != null
            ? Number(benefit['maxRolloverUnits'])
            : undefined,
        });
      } catch (err) {
        this.logger.warn(
          `Entitlement provision failed for benefit "${benefit['benefitType']}" ` +
          `on membership ${membership.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Enrolled ${membership.memberNumber} on plan "${plan.name}" — tenant: ${tenantId}`,
    );

    return membership;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    query: { userId?: string; planId?: string; status?: MembershipStatus; limit?: number; offset?: number },
  ): Promise<MembershipEntity[]> {
    return this.membershipRepository.query({ tenantId, ...query });
  }

  async findOne(id: string, tenantId: string): Promise<MembershipEntity> {
    return this.membershipRepository.findByIdOrFail(id, tenantId);
  }

  async findActiveByUser(
    userId:   string,
    tenantId: string,
  ): Promise<MembershipEntity | null> {
    return this.membershipRepository.findActiveByUser(userId, tenantId);
  }

  async findTransactions(
    membershipId: string,
    tenantId:     string,
    limit = 50,
    offset = 0,
  ): Promise<MembershipTransactionEntity[]> {
    await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
    return this.membershipRepository.findTransactions(membershipId, tenantId, limit, offset);
  }

  // ── Activate ──────────────────────────────────────────────────────────────

  async activate(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m    = await this.membershipRepository.findByIdOrFail(id, tenantId);
    const prev = m.status;
    this.assertTransitionAllowed(prev, 'active');

    const plan = await this.planRepository.findByIdOrFail(m.planId, tenantId);
    const now  = new Date();

    // Compute renewsAt from billing cycle
    let renewsAt: Date | null = null;
    if (plan.billingCycle !== 'lifetime') {
      const ms: Record<string, number> = {
        monthly:    30,
        quarterly:  90,
        annual:     365,
      };
      const days = ms[plan.billingCycle] ?? 30;
      renewsAt = new Date(now.getTime() + days * 86_400_000);
    }

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status:      'active',
      activatedAt: now,
      renewsAt,
      updatedById: actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'activated',
      actorId, actorType: 'user', previousStatus: prev, newStatus: 'active',
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'active');
    await this.eventEmitter.emitAsync(MembershipEvents.ACTIVATED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: now.toISOString(),
    });

    return updated;
  }

  // ── Freeze ────────────────────────────────────────────────────────────────

  async freeze(
    id:       string,
    dto:      FreezeMembershipDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m    = await this.membershipRepository.findByIdOrFail(id, tenantId);
    const prev = m.status;
    this.assertTransitionAllowed(prev, 'frozen');

    const frozenUntil = new Date(dto.frozenUntil);
    if (frozenUntil <= new Date()) {
      throw new BadRequestException('frozenUntil must be a future date');
    }
    const freezeDays = Math.ceil(
      (frozenUntil.getTime() - Date.now()) / 86_400_000,
    );

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status:              'frozen',
      frozenAt:            new Date(),
      frozenUntil,
      totalFreezeDaysUsed: (m.totalFreezeDaysUsed ?? 0) + freezeDays,
      updatedById:         actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'frozen',
      actorId, actorType: 'user', previousStatus: prev, newStatus: 'frozen',
      note: `Frozen until ${dto.frozenUntil}`,
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'frozen');
    await this.eventEmitter.emitAsync(MembershipEvents.FROZEN, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Unfreeze ──────────────────────────────────────────────────────────────

  async unfreeze(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m    = await this.membershipRepository.findByIdOrFail(id, tenantId);
    this.assertTransitionAllowed(m.status, 'active');

    if (m.status !== 'frozen') {
      throw new BadRequestException('Membership is not frozen');
    }

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status:      'active',
      frozenAt:    null,
      frozenUntil: null,
      updatedById: actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'unfrozen',
      actorId, actorType: 'user', previousStatus: 'frozen', newStatus: 'active',
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, 'frozen', 'active');
    await this.eventEmitter.emitAsync(MembershipEvents.UNFROZEN, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(
    id:       string,
    dto:      CancelMembershipDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m    = await this.membershipRepository.findByIdOrFail(id, tenantId);
    const prev = m.status;

    if (isTerminal(prev)) {
      throw new BadRequestException(
        `Membership is already in terminal state "${prev}" and cannot be cancelled`,
      );
    }

    const newStatus: MembershipStatus = dto.immediate
      ? 'cancelled'
      : 'cancellation_pending';

    this.assertTransitionAllowed(prev, newStatus);

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status:             newStatus,
      cancelledAt:        dto.immediate ? new Date() : null,
      cancellationReason: dto.reason    ?? null,
      updatedById:        actorId,
    });

    const action = dto.immediate ? 'cancelled' : 'cancellation_scheduled';

    await this.logTransition({
      tenantId, membershipId: id, action,
      actorId, actorType: 'user', previousStatus: prev, newStatus,
      note: dto.reason,
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, newStatus);

    const event = dto.immediate
      ? MembershipEvents.CANCELLED
      : MembershipEvents.CANCELLATION_SCHEDULED;
    await this.eventEmitter.emitAsync(event, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });

    // Deactivate entitlement balances on immediate cancellation
    if (dto.immediate) {
      await this.entitlementService.deactivateAll(id, tenantId, actorId).catch((err) => {
        this.logger.warn(`cancel: entitlement deactivation failed for ${id}: ${(err as Error).message}`);
      });
    }

    return updated;
  }

  // ── Suspend / Restore (admin) ─────────────────────────────────────────────

  async suspend(
    id:       string,
    tenantId: string,
    actorId:  string,
    note?:    string,
  ): Promise<MembershipEntity> {
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
    await this.eventEmitter.emitAsync(MembershipEvents.SUSPENDED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });
    await this.entitlementService.deactivateAll(id, tenantId, actorId).catch((err) => {
      this.logger.warn(`suspend: entitlement deactivation failed for ${id}: ${(err as Error).message}`);
    });
    return updated;
  }

  async restore(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
    if (m.status !== 'suspended') {
      throw new BadRequestException('Membership is not suspended');
    }
    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status: 'active', updatedById: actorId,
    });
    await this.logTransition({
      tenantId, membershipId: id, action: 'restored',
      actorId, actorType: 'staff', previousStatus: 'suspended', newStatus: 'active',
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, 'suspended', 'active');
    await this.eventEmitter.emitAsync(MembershipEvents.RESTORED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  // ── Schedule downgrade ────────────────────────────────────────────────────

  async scheduleDowngrade(
    id:       string,
    dto:      ScheduleDowngradeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
    if (m.status !== 'active') {
      throw new BadRequestException('Only active memberships can be scheduled for downgrade');
    }
    // Verify target plan exists
    await this.planRepository.findByIdOrFail(dto.targetPlanId, tenantId);

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      pendingDowngradePlanId: dto.targetPlanId,
      updatedById:            actorId,
    });
    await this.logTransition({
      tenantId, membershipId: id, action: 'downgrade_scheduled',
      actorId, actorType: 'user', previousStatus: m.status, newStatus: m.status,
      note: `Target plan: ${dto.targetPlanId}`,
    });
    await this.eventEmitter.emitAsync(MembershipEvents.DOWNGRADE_SCHEDULED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  // ── General patch (admin) ─────────────────────────────────────────────────

  async update(
    id:       string,
    dto:      UpdateMembershipDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
    if (isTerminal(m.status)) {
      throw new BadRequestException(
        `Cannot modify a membership in terminal state "${m.status}"`,
      );
    }
    const updated = await this.membershipRepository.updateById(id, tenantId, {
      ...(dto.autoRenew  !== undefined && { autoRenew:  dto.autoRenew  }),
      ...(dto.seatLabel  !== undefined && { seatLabel:  dto.seatLabel  }),
      updatedById: actorId,
    });
    await this.logTransition({
      tenantId, membershipId: id, action: 'updated',
      actorId, actorType: 'staff', previousStatus: m.status, newStatus: m.status,
    });
    return updated;
  }

  // ── Assign user to corporate seat ────────────────────────────────────────

  async assignUser(
    id:       string,
    dto:      AssignUserDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipEntity> {
    const m = await this.membershipRepository.findByIdOrFail(id, tenantId);
    if (m.membershipType !== 'corporate') {
      throw new BadRequestException('assignUser is only valid on corporate memberships');
    }
    const updated = await this.membershipRepository.updateById(id, tenantId, {
      userId:      dto.userId,
      seatLabel:   dto.seatLabel ?? m.seatLabel,
      updatedById: actorId,
    });
    await this.logTransition({
      tenantId, membershipId: id, action: 'user_assigned',
      actorId, actorType: 'staff', previousStatus: m.status, newStatus: m.status,
      note: `Assigned userId ${dto.userId}`,
    });
    return updated;
  }

  // ── Expire ────────────────────────────────────────────────────────────────

  /**
   * Transitions a membership to 'expired'.
   * Called by: scheduler (trial expiry, grace-period expiry), manual admin action.
   * Emits MEMBERSHIP_EXPIRED.
   */
  async expire(
    id:        string,
    tenantId:  string,
    actorId:   string,
    actorType: 'system' | 'staff' = 'system',
  ): Promise<MembershipEntity> {
    const m    = await this.membershipRepository.findByIdOrFail(id, tenantId);
    const prev = m.status;
    this.assertTransitionAllowed(prev, 'expired');

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status:      'expired',
      expiresAt:   new Date(),
      updatedById: actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'expired',
      actorId, actorType, previousStatus: prev, newStatus: 'expired',
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'expired');
    await this.eventEmitter.emitAsync(MembershipEvents.EXPIRED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });

    await this.entitlementService.deactivateAll(id, tenantId, actorId).catch((err) => {
      this.logger.warn(`expire: entitlement deactivation failed for ${id}: ${(err as Error).message}`);
    });

    this.logger.log(
      `Membership ${m.memberNumber} expired (${prev} → expired) — tenant: ${tenantId}`,
    );
    return updated;
  }

  // ── Renew ─────────────────────────────────────────────────────────────────

  /**
   * Records a completed renewal: transitions pending_renewal/payment_failed → active
   * and advances renewsAt by one billing cycle.
   * Finance-service calls this after a successful payment (via event listener in Batch 6.3).
   * Can also be called directly by admin staff.
   */
  async renew(
    id:        string,
    tenantId:  string,
    actorId:   string,
    actorType: 'system' | 'staff' = 'system',
  ): Promise<MembershipEntity> {
    const m    = await this.membershipRepository.findByIdOrFail(id, tenantId);
    const prev = m.status;
    this.assertTransitionAllowed(prev, 'active');

    const plan = await this.planRepository.findByIdOrFail(m.planId, tenantId);

    const cycleMs: Record<string, number> = {
      monthly:   30 * 86_400_000,
      quarterly: 90 * 86_400_000,
      annual:   365 * 86_400_000,
    };
    const now      = new Date();
    const base     = m.renewsAt && m.renewsAt > now ? m.renewsAt : now;
    const interval = cycleMs[plan.billingCycle];
    const renewsAt = interval ? new Date(base.getTime() + interval) : null;

    const updated = await this.membershipRepository.updateById(id, tenantId, {
      status:      'active',
      renewsAt,
      expiresAt:   null,
      updatedById: actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'renewed',
      actorId, actorType, previousStatus: prev, newStatus: 'active',
      note: renewsAt ? `Next renewal: ${renewsAt.toISOString()}` : 'Lifetime — no renewal',
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'active');
    await this.eventEmitter.emitAsync(MembershipEvents.RENEWED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: now.toISOString(),
    });

    return updated;
  }

  // ── Upgrade ───────────────────────────────────────────────────────────────

  /**
   * Upgrades a membership to a different (higher) plan.
   * Terminates the current membership as 'upgraded' and creates a new
   * membership in 'pending_payment' for the target plan.
   * The new membership inherits the same userId and memberNumber prefix.
   * Finance integration (proration credit) is handled in Batch 6.3.
   */
  async upgrade(
    id:       string,
    dto:      UpgradeMembershipDto,
    tenantId: string,
    actorId:  string,
  ): Promise<{ previous: MembershipEntity; next: MembershipEntity }> {
    const m = await this.membershipRepository.findByIdOrFail(id, tenantId);

    if (isTerminal(m.status)) {
      throw new BadRequestException(
        `Cannot upgrade a membership in terminal state "${m.status}"`,
      );
    }
    if (m.planId === dto.targetPlanId) {
      throw new BadRequestException('Target plan is the same as the current plan');
    }

    const targetPlan = await this.planRepository.findByIdOrFail(dto.targetPlanId, tenantId);
    if (!targetPlan.isActive) {
      throw new BadRequestException('Target plan is not active');
    }

    // Mark current membership as upgraded (terminal)
    const prev    = m.status;
    const previous = await this.membershipRepository.updateById(id, tenantId, {
      status:      'upgraded',
      updatedById: actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'upgraded',
      actorId, actorType: 'user', previousStatus: prev, newStatus: 'upgraded',
      note: `Upgraded to plan ${dto.targetPlanId}`,
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, prev, 'upgraded');
    await this.eventEmitter.emitAsync(MembershipEvents.UPGRADED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });

    // Enrol on the new plan — benefit snapshot taken fresh
    const next = await this.enrol(
      {
        planId:            dto.targetPlanId,
        userId:            m.userId ?? undefined,
        membershipType:    targetPlan.membershipType,
        autoRenew:         m.autoRenew,
        parentMembershipId: m.parentMembershipId ?? undefined,
        seatLabel:         m.seatLabel ?? undefined,
      },
      tenantId,
      actorId,
    );

    return { previous, next };
  }

  // ── Execute downgrade ─────────────────────────────────────────────────────

  /**
   * Executes a scheduled downgrade at renewal time.
   * Called by the scheduler when renewsAt ≤ now and pendingDowngradePlanId is set.
   * Terminates the current membership as 'downgraded' and creates a new one
   * on the target plan.
   */
  async executeDowngrade(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<{ previous: MembershipEntity; next: MembershipEntity }> {
    const m = await this.membershipRepository.findByIdOrFail(id, tenantId);

    if (m.status !== 'active') {
      throw new BadRequestException('Downgrade can only execute on an active membership');
    }
    if (!m.pendingDowngradePlanId) {
      throw new BadRequestException('Membership has no pending downgrade');
    }

    const targetPlan = await this.planRepository.findByIdOrFail(
      m.pendingDowngradePlanId,
      tenantId,
    );

    // Terminate current as 'downgraded'
    const previous = await this.membershipRepository.updateById(id, tenantId, {
      status:                'downgraded',
      pendingDowngradePlanId: null,
      updatedById:           actorId,
    });

    await this.logTransition({
      tenantId, membershipId: id, action: 'downgraded',
      actorId, actorType: 'system', previousStatus: 'active', newStatus: 'downgraded',
      note: `Downgraded to plan ${m.pendingDowngradePlanId}`,
    });
    await this.emitStatusChanged(tenantId, id, m.userId, actorId, 'active', 'downgraded');
    await this.eventEmitter.emitAsync(MembershipEvents.DOWNGRADED, {
      tenantId, membershipId: id, userId: m.userId, actorId,
      timestamp: new Date().toISOString(),
    });

    // Enrol on the lower plan
    const next = await this.enrol(
      {
        planId:            m.pendingDowngradePlanId,
        userId:            m.userId ?? undefined,
        membershipType:    targetPlan.membershipType,
        autoRenew:         m.autoRenew,
        parentMembershipId: m.parentMembershipId ?? undefined,
        seatLabel:         m.seatLabel ?? undefined,
      },
      tenantId,
      actorId,
    );

    return { previous, next };
  }

  // ── Membership status (cross-engine read) ────────────────────────────────

  /**
   * Returns the lightweight MembershipStatusDto consumed by Booking and Pricing.
   * Queries the active membership + entitlement balances in two DB reads.
   * No Redis cache — raw DB read (cache is a Batch 6.5 concern).
   *
   * Callers MUST use this method rather than querying membership tables directly.
   */
  async getMembershipStatus(
    userId:   string,
    tenantId: string,
  ): Promise<MembershipStatusDto> {
    const NON_MEMBER: MembershipStatusDto = {
      isMember:                  false,
      membershipId:              null,
      membershipTier:            null,
      membershipType:            null,
      membershipStatus:          null,
      priorityBookingHoursAhead: 0,
      courtCreditsRemaining:     0,
      coachCreditsRemaining:     0,
      guestPassesRemaining:      0,
      tournamentCreditsRemaining: 0,
      cafeCreditMinor:           0,
      lockerAccess:              false,
      parkingAccess:             false,
      discountEligible:          false,
    };

    const membership = await this.membershipRepository.findActiveByUser(userId, tenantId);
    if (!membership) return NON_MEMBER;

    const isActive = membership.status === 'active' || membership.status === 'trial';
    if (!isActive) {
      return { ...NON_MEMBER, membershipStatus: membership.status };
    }

    // Resolve plan slug for tier (used by Pricing to match tier-based rules)
    const plan = await this.planRepository.findById(membership.planId, tenantId);

    const balances = await this.entitlementService.findAll(membership.id, tenantId);

    const get = (type: string): number => {
      const b = balances.find((x) => x.benefitType === type);
      return b ? Math.max(0, b.balance - b.reservedUnits) : 0;
    };

    const hasDiscount = (membership.benefitSnapshot ?? []).some((b) =>
      ['booking_discount_pct', 'booking_discount_fixed'].includes(String(b['benefitType'] ?? '')),
    );

    const priorityBalance = balances.find(
      (b) => b.benefitType === 'priority_booking_hours',
    );

    return {
      isMember:                  true,
      membershipId:              membership.id,
      membershipTier:            plan?.slug ?? null,
      membershipType:            membership.membershipType,
      membershipStatus:          membership.status,
      priorityBookingHoursAhead: priorityBalance
        ? Math.max(0, priorityBalance.balance - priorityBalance.reservedUnits)
        : 0,
      courtCreditsRemaining:     get('court_credit'),
      coachCreditsRemaining:     get('coaching_credit'),
      guestPassesRemaining:      get('guest_pass'),
      tournamentCreditsRemaining: get('tournament_credit'),
      cafeCreditMinor:           get('cafe_credit'),
      lockerAccess:              get('locker_access') > 0,
      parkingAccess:             get('parking_access') > 0,
      discountEligible:          hasDiscount,
    };
  }

  // ── Scheduler-facing batch methods ────────────────────────────────────────

  /**
   * Expires all trial memberships whose trialEndsAt has passed.
   * Runs cross-tenant; called by MembershipSchedulerService.
   */
  async autoExpireTrials(): Promise<number> {
    const batchSize = 50;
    const candidates = await this.membershipRepository.findExpiredTrials(batchSize);
    let count = 0;
    for (const m of candidates) {
      try {
        await this.expire(m.id, m.tenantId, 'system');
        count++;
      } catch (err) {
        this.logger.warn(`autoExpireTrials: ${m.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoExpireTrials: expired ${count} trial(s)`);
    return count;
  }

  /**
   * Expires payment_failed memberships whose grace period has passed.
   */
  async autoExpireGrace(): Promise<number> {
    const batchSize = 50;
    const candidates = await this.membershipRepository.findGraceExpired(batchSize);
    let count = 0;
    for (const m of candidates) {
      try {
        await this.expire(m.id, m.tenantId, 'system');
        count++;
      } catch (err) {
        this.logger.warn(`autoExpireGrace: ${m.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoExpireGrace: expired ${count} membership(s)`);
    return count;
  }

  /**
   * Sends renewal reminders for memberships approaching their renewsAt.
   * Emits RENEWAL_INVOICE_REQUESTED — Finance-service listener picks this up.
   */
  async autoRequestRenewals(leadDays: number): Promise<number> {
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
        await this.emitStatusChanged(
          m.tenantId, m.id, m.userId, 'system', m.status, 'pending_renewal',
        );
        await this.eventEmitter.emitAsync(MembershipEvents.RENEWAL_INVOICE_REQUESTED, {
          tenantId: m.tenantId, membershipId: m.id, userId: m.userId,
          actorId: 'system', timestamp: new Date().toISOString(),
        });
        void updated;
        count++;
      } catch (err) {
        this.logger.warn(`autoRequestRenewals: ${m.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoRequestRenewals: queued ${count} renewal(s)`);
    return count;
  }

  /**
   * Lifts freeze on memberships whose frozenUntil has passed.
   * Extends renewsAt by the number of freeze days consumed.
   */
  async autoLiftFreezes(): Promise<number> {
    const batchSize = 50;
    const candidates = await this.membershipRepository.findFreezeExpired(batchSize);
    let count = 0;
    for (const m of candidates) {
      try {
        // Extend renewsAt by freeze duration
        const freezeMs = m.frozenUntil && m.frozenAt
          ? m.frozenUntil.getTime() - m.frozenAt.getTime()
          : 0;
        const renewsAt = m.renewsAt
          ? new Date(m.renewsAt.getTime() + freezeMs)
          : null;

        await this.membershipRepository.updateById(m.id, m.tenantId, {
          status:      'active',
          frozenAt:    null,
          frozenUntil: null,
          renewsAt,
        });
        await this.logTransition({
          tenantId: m.tenantId, membershipId: m.id, action: 'unfrozen',
          actorId: 'system', actorType: 'system',
          previousStatus: 'frozen', newStatus: 'active',
          note: `Auto-unfrozen; renewsAt extended to ${renewsAt?.toISOString() ?? 'unchanged'}`,
        });
        await this.emitStatusChanged(
          m.tenantId, m.id, m.userId, 'system', 'frozen', 'active',
        );
        await this.eventEmitter.emitAsync(MembershipEvents.UNFROZEN, {
          tenantId: m.tenantId, membershipId: m.id, userId: m.userId,
          actorId: 'system', timestamp: new Date().toISOString(),
        });
        count++;
      } catch (err) {
        this.logger.warn(`autoLiftFreezes: ${m.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoLiftFreezes: unfrozen ${count} membership(s)`);
    return count;
  }

  /**
   * Executes pending downgrades for memberships whose renewsAt has passed.
   */
  async autoExecuteDowngrades(): Promise<number> {
    const batchSize = 50;
    const candidates = await this.membershipRepository.findPendingDowngrades(batchSize);
    let count = 0;
    for (const m of candidates) {
      try {
        await this.executeDowngrade(m.id, m.tenantId, 'system');
        count++;
      } catch (err) {
        this.logger.warn(`autoExecuteDowngrades: ${m.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoExecuteDowngrades: executed ${count} downgrade(s)`);
    return count;
  }

  /**
   * Finalises cancellations for memberships in cancellation_pending
   * whose period end (renewsAt) has passed.
   */
  async autoFinaliseCancellations(): Promise<number> {
    const batchSize = 50;
    const candidates = await this.membershipRepository.findPendingCancellations(batchSize);
    let count = 0;
    for (const m of candidates) {
      try {
        await this.membershipRepository.updateById(m.id, m.tenantId, {
          status:      'cancelled',
          cancelledAt: new Date(),
        });
        await this.logTransition({
          tenantId: m.tenantId, membershipId: m.id, action: 'cancelled',
          actorId: 'system', actorType: 'system',
          previousStatus: 'cancellation_pending', newStatus: 'cancelled',
        });
        await this.emitStatusChanged(
          m.tenantId, m.id, m.userId, 'system', 'cancellation_pending', 'cancelled',
        );
        await this.eventEmitter.emitAsync(MembershipEvents.CANCELLED, {
          tenantId: m.tenantId, membershipId: m.id, userId: m.userId,
          actorId: 'system', timestamp: new Date().toISOString(),
        });
        count++;
      } catch (err) {
        this.logger.warn(`autoFinaliseCancellations: ${m.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoFinaliseCancellations: cancelled ${count} membership(s)`);
    return count;
  }
}

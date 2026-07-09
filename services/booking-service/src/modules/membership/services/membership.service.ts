import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

// ── State machine ─────────────────────────────────────────────────────────────

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
}

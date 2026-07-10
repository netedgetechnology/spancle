import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountingPeriodRepository } from '../repositories/accounting-period.repository';
import type { AccountingPeriodEntity } from '../entities/accounting-period.entity';

/**
 * Thrown when a journal entry targets a closed or locked accounting period.
 * Finance Engine callers must catch this and re-post with the current period date.
 */
export class PeriodClosedException extends BadRequestException {
  constructor(period: string, status: string) {
    super(
      `Accounting period ${period} is ${status}. ` +
      `Journal entries cannot be posted into a ${status} period. ` +
      `Use the current open period.`,
    );
  }
}

@Injectable()
export class AccountingPeriodService {
  private readonly logger = new Logger(AccountingPeriodService.name);

  constructor(
    private readonly periodRepository: AccountingPeriodRepository,
  ) {}

  // ── Formatting helpers ──────────────────────────────────────────────────────

  /** Converts a Date to YYYY-MM format. */
  static periodOf(date: Date): string {
    return date.toISOString().slice(0, 7);
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  /**
   * Ensures the current calendar month exists as an open period for this tenant.
   * Called on Finance module startup and on tenant creation.
   * Idempotent: returns existing period if already open.
   */
  async ensureCurrentPeriodOpen(tenantId: string): Promise<AccountingPeriodEntity> {
    const period  = AccountingPeriodService.periodOf(new Date());
    const existing = await this.periodRepository.findByPeriod(period, tenantId);
    if (existing) return existing;

    this.logger.log(`Opening accounting period ${period} for tenant ${tenantId}`);
    return this.periodRepository.create({
      tenantId,
      period,
      status:   'open',
      openedAt: new Date(),
    });
  }

  // ── Guard ───────────────────────────────────────────────────────────────────

  /**
   * Validates that the target date falls within an open accounting period.
   * Called by DoubleEntryService.post() before every journal entry insertion.
   *
   * @throws PeriodClosedException when period is closed or locked.
   * @throws NotFoundException when no period exists for this month.
   */
  async assertOpen(tenantId: string, postedAt: Date): Promise<AccountingPeriodEntity> {
    const period = AccountingPeriodService.periodOf(postedAt);
    const ap     = await this.periodRepository.findByPeriod(period, tenantId);

    if (!ap) {
      // Period doesn't exist yet — auto-open it if it's the current month
      const currentPeriod = AccountingPeriodService.periodOf(new Date());
      if (period === currentPeriod) {
        return this.ensureCurrentPeriodOpen(tenantId);
      }
      throw new NotFoundException(
        `Accounting period ${period} has not been opened for this tenant`,
      );
    }

    if (ap.status === 'closed' || ap.status === 'locked' || ap.status === 'closing') {
      throw new PeriodClosedException(period, ap.status);
    }

    return ap;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string): Promise<AccountingPeriodEntity[]> {
    return this.periodRepository.findAll(tenantId);
  }

  async findOpen(tenantId: string): Promise<AccountingPeriodEntity | null> {
    return this.periodRepository.findOpen(tenantId);
  }

  // ── Period close ─────────────────────────────────────────────────────────────

  /**
   * Begins the period close sequence.
   *
   * 1. Sets the period to 'closing' (blocks new entries).
   * 2. Caller is responsible for:
   *    a. Running GL balance snapshot (Batch 7.8)
   *    b. Calling confirmClose() after snapshot completes
   * 3. Opens the next calendar month.
   *
   * Only one period may be 'closing' at a time per tenant.
   */
  async beginClose(
    period:      string,
    tenantId:    string,
    actorId:     string,
  ): Promise<AccountingPeriodEntity> {
    const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);

    if (ap.status !== 'open') {
      throw new BadRequestException(
        `Period ${period} is already ${ap.status} and cannot be closed again`,
      );
    }

    this.logger.log(`Beginning close of period ${period} — tenant: ${tenantId}`);

    const closing = await this.periodRepository.updateStatus(ap.id, 'closing', {
      closedById: actorId,
    });

    // Open the next period
    const next = this.nextPeriod(period);
    const alreadyOpen = await this.periodRepository.findByPeriod(next, tenantId);
    if (!alreadyOpen) {
      await this.periodRepository.create({
        tenantId,
        period:   next,
        status:   'open',
        openedAt: new Date(),
      });
      this.logger.log(`Opened next accounting period ${next} — tenant: ${tenantId}`);
    }

    return closing;
  }

  /**
   * Finalises the period close: sets status to 'closed'.
   * Called after the GL balance snapshot has been written (Batch 7.8).
   */
  async confirmClose(
    period:   string,
    tenantId: string,
  ): Promise<AccountingPeriodEntity> {
    const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
    if (ap.status !== 'closing') {
      throw new BadRequestException(`Period ${period} is not in 'closing' state`);
    }
    return this.periodRepository.updateStatus(ap.id, 'closed', {
      closedAt: new Date(),
    });
  }

  /**
   * Locks a closed period (post-tax-filing).
   * Only SUPER_ADMIN should call this; enforced by the controller RBAC.
   */
  async lock(
    period:   string,
    tenantId: string,
    actorId:  string,
  ): Promise<AccountingPeriodEntity> {
    const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
    if (ap.status !== 'closed') {
      throw new BadRequestException(`Only closed periods can be locked (current: ${ap.status})`);
    }
    this.logger.log(`Locking period ${period} — actor: ${actorId} tenant: ${tenantId}`);
    return this.periodRepository.updateStatus(ap.id, 'locked', {
      lockedAt:   new Date(),
      lockedById: actorId,
    });
  }

  /**
   * Reopens a closed period — SUPER_ADMIN only; requires a mandatory note.
   * Emitting an audit event is handled by the controller layer.
   */
  async reopen(
    period:   string,
    tenantId: string,
    actorId:  string,
    note:     string,
  ): Promise<AccountingPeriodEntity> {
    if (!note?.trim()) {
      throw new BadRequestException('A mandatory note is required to reopen a closed period');
    }
    const ap = await this.periodRepository.findByPeriodOrFail(period, tenantId);
    if (ap.status === 'open') {
      throw new ConflictException(`Period ${period} is already open`);
    }
    if (ap.status === 'locked') {
      throw new ForbiddenException(
        `Period ${period} is locked. Only SUPER_ADMIN can unlock — ` +
        `contact Spancle platform support.`,
      );
    }
    this.logger.warn(
      `PERIOD REOPEN — period: ${period} actor: ${actorId} tenant: ${tenantId} note: ${note}`,
    );
    return this.periodRepository.updateStatus(ap.id, 'open', { notes: note });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private nextPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number) as [number, number];
    const next = month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, '0')}`;
    return next;
  }
}

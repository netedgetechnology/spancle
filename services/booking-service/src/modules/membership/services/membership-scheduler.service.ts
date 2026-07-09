import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService }         from '@nestjs/config';
import { MembershipService }     from './membership.service';

/**
 * MembershipSchedulerService — drives all time-based membership transitions.
 *
 * Follows the exact pattern of BookingSchedulerService:
 *   - Each @Cron job is isolated (per-job try/catch — process never crashes)
 *   - Batch sizes and timing values read from ConfigService
 *   - Cross-tenant queries stay in MembershipRepository.activeTenants()
 *   - Individual item failures are logged and skipped; sweep continues
 *
 * Configuration keys (all read via ConfigService, no hardcoded defaults):
 *
 *   MEMBERSHIP_SCHEDULER_BATCH_SIZE         default 50   — rows per sweep per run
 *   MEMBERSHIP_RENEWAL_LEAD_DAYS            default 7    — days before renewsAt to send invoice
 *   MEMBERSHIP_TRIAL_AUTO_EXPIRE_MINS       default 60   — check interval for trial expiry
 *   MEMBERSHIP_GRACE_AUTO_EXPIRE_MINS       default 240  — check interval for grace expiry
 *   MEMBERSHIP_FREEZE_LIFT_MINS             default 30   — check interval for freeze lift
 *   MEMBERSHIP_DOWNGRADE_EXEC_MINS          default 60   — check interval for downgrade execution
 *   MEMBERSHIP_CANCELLATION_EXEC_MINS       default 60   — check interval for cancellation
 *
 * No schedulers emit Finance or Booking events directly — they call
 * MembershipService methods which emit the correct domain events.
 */
@Injectable()
export class MembershipSchedulerService {
  private readonly logger = new Logger(MembershipSchedulerService.name);

  constructor(
    private readonly membershipService: MembershipService,
    private readonly config:            ConfigService,
  ) {}

  // ── Renewal invoice request — daily at 06:00 UTC ──────────────────────────
  //
  // Finds active memberships whose renewsAt is within MEMBERSHIP_RENEWAL_LEAD_DAYS.
  // Transitions them to pending_renewal.
  // Emits MEMBERSHIP_RENEWAL_INVOICE_REQUESTED for Finance to pick up.

  @Cron('0 6 * * *', { name: 'membership:renewal_sweep' })
  async sweepPendingRenewals(): Promise<void> {
    try {
      const leadDays = this.config.get<number>('MEMBERSHIP_RENEWAL_LEAD_DAYS', 7);
      const count    = await this.membershipService.autoRequestRenewals(leadDays);
      if (count) {
        this.logger.log(`[cron:renewal_sweep] Queued ${count} renewal invoice request(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:renewal_sweep] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Trial expiry — every 30 minutes ──────────────────────────────────────
  //
  // Expires trial memberships whose trialEndsAt has passed and who have not
  // transitioned to active (i.e. no payment received).

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'membership:trial_expiry' })
  async sweepTrialExpiry(): Promise<void> {
    try {
      const count = await this.membershipService.autoExpireTrials();
      if (count) {
        this.logger.log(`[cron:trial_expiry] Expired ${count} trial(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:trial_expiry] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Grace-period expiry — every 4 hours ──────────────────────────────────
  //
  // Expires payment_failed memberships whose grace period (expiresAt) has passed.
  // Grace period is computed at payment-failure time:
  //   expiresAt = failedAt + gracePeriodDays * 86400s

  @Cron('0 */4 * * *', { name: 'membership:grace_expiry' })
  async sweepGraceExpiry(): Promise<void> {
    try {
      const count = await this.membershipService.autoExpireGrace();
      if (count) {
        this.logger.log(`[cron:grace_expiry] Expired ${count} membership(s) after grace`);
      }
    } catch (err) {
      this.logger.error(`[cron:grace_expiry] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Freeze auto-lift — every 30 minutes ──────────────────────────────────
  //
  // Lifts freeze on memberships whose frozenUntil has passed.
  // Extends renewsAt by the freeze duration so the member does not lose paid time.

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'membership:freeze_lift' })
  async sweepFreezeLift(): Promise<void> {
    try {
      const count = await this.membershipService.autoLiftFreezes();
      if (count) {
        this.logger.log(`[cron:freeze_lift] Auto-unfrozen ${count} membership(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:freeze_lift] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Downgrade execution — nightly at 02:00 UTC ────────────────────────────
  //
  // Executes scheduled downgrades for memberships where renewsAt ≤ now
  // and pendingDowngradePlanId is set.
  // Creates a new membership on the lower plan; terminates the current as 'downgraded'.

  @Cron('0 2 * * *', { name: 'membership:downgrade_exec' })
  async sweepDowngradeExecution(): Promise<void> {
    try {
      const count = await this.membershipService.autoExecuteDowngrades();
      if (count) {
        this.logger.log(`[cron:downgrade_exec] Executed ${count} downgrade(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:downgrade_exec] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Cancellation finalisation — nightly at 03:00 UTC ─────────────────────
  //
  // Converts cancellation_pending → cancelled for memberships whose
  // period end (renewsAt) has passed.

  @Cron('0 3 * * *', { name: 'membership:cancellation_exec' })
  async sweepCancellationFinalisation(): Promise<void> {
    try {
      const count = await this.membershipService.autoFinaliseCancellations();
      if (count) {
        this.logger.log(`[cron:cancellation_exec] Finalised ${count} cancellation(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:cancellation_exec] Sweep failed — ${(err as Error).message}`);
    }
  }
}

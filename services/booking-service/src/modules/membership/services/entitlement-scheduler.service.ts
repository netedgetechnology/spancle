import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntitlementService }   from './entitlement.service';

/**
 * EntitlementSchedulerService — drives time-based entitlement maintenance.
 *
 * Pattern identical to BookingSchedulerService and MembershipSchedulerService:
 *   - Each @Cron job is isolated (per-job try/catch — process never crashes)
 *   - Individual failures logged and skipped
 *   - Delegates to EntitlementService; no direct DB access
 *
 * Configuration (via MEMBERSHIP_SCHEDULER_BATCH_SIZE env — default 100 in service).
 */
@Injectable()
export class EntitlementSchedulerService {
  private readonly logger = new Logger(EntitlementSchedulerService.name);

  constructor(private readonly entitlementService: EntitlementService) {}

  // ── Nightly balance reset — 02:30 UTC ────────────────────────────────────
  //
  // Resets all entitlement balances whose nextResetAt has passed.
  // Runs after MembershipSchedulerService.sweepDowngradeExecution (02:00)
  // so newly created memberships from downgrades get fresh balances first.
  // Each reset: updates balance, inserts ledger row, emits ENTITLEMENT_BALANCE_RESET.

  @Cron('30 2 * * *', { name: 'entitlement:period_reset' })
  async resetDueBalances(): Promise<void> {
    try {
      const count = await this.entitlementService.autoResetDueBalances();
      if (count) {
        this.logger.log(`[cron:period_reset] Reset ${count} entitlement balance(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:period_reset] Failed — ${(err as Error).message}`);
    }
  }

  // ── Stale reservation cleanup — every 4 hours ─────────────────────────────
  //
  // Clears reservedUnits on balances belonging to inactive memberships.
  // Prevents units being locked indefinitely after membership expiry/cancel.

  @Cron('0 */4 * * *', { name: 'entitlement:stale_reservations' })
  async releaseStaleReservations(): Promise<void> {
    try {
      const count = await this.entitlementService.autoReleaseStaleReservations();
      if (count) {
        this.logger.log(`[cron:stale_reservations] Cleared ${count} stale reservation(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:stale_reservations] Failed — ${(err as Error).message}`);
    }
  }
}

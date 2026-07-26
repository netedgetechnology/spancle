import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource }    from '@nestjs/typeorm';
import { DataSource }          from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { BookingService }      from './booking.service';
import { SlotService }         from '../../slot/services/slot.service';

/**
 * BookingSchedulerService — drives all time-based booking transitions.
 *
 * All timing values are read from ConfigService so they can be adjusted
 * without code changes:
 *
 *   BOOKING_RESERVATION_TTL_MINS     (default 15)  — reservation hold window
 *   BOOKING_NO_SHOW_GRACE_MINS       (default 30)  — minutes past start before no-show
 *   BOOKING_AUTOCOMPLETE_DELAY_MINS  (default 0)   — delay after end time before auto-complete
 *   BOOKING_SCHEDULER_BATCH_SIZE     (default 50)  — rows processed per sweep per tenant
 *
 * Each job processes all active tenants discovered from the bookings table.
 * Cross-tenant processing uses the raw DataSource to list tenants — it never
 * exposes data across tenant boundaries (each booking operation is scoped).
 *
 * Job failure is isolated: a single booking's failure is logged and skipped;
 * the sweep continues. Job-level failures are caught and logged; the process
 * does not crash.
 */
@Injectable()
export class BookingSchedulerService {
  private readonly logger = new Logger(BookingSchedulerService.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly slotService:    SlotService,
    private readonly config:         ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Reservation expiry — every 60 seconds ─────────────────────────────────
  //
  // Uses a cross-tenant query because expiresAt is a wall-clock value
  // independent of tenant; this job only fires expire() which is tenant-scoped.

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleReservations(): Promise<void> {
    try {
      const count = await this.bookingService.autoExpireReservations();
      if (count) {
        this.logger.log(`[cron:expire] Released ${count} stale reservation(s)`);
      }
    } catch (err) {
      this.logger.error(`[cron:expire] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Auto in-progress — every 60 seconds ───────────────────────────────────
  //
  // Transitions confirmed bookings to in_progress when startsAt ≤ now.
  // Runs per tenant to keep queries narrow.

  @Cron(CronExpression.EVERY_MINUTE)
  async markInProgressStarted(): Promise<void> {
    try {
      for (const tenantId of await this.activeTenants()) {
        const count = await this.bookingService.autoMarkInProgress(tenantId);
        if (count) {
          this.logger.log(`[cron:in_progress] tenant=${tenantId} count=${count}`);
        }
      }
    } catch (err) {
      this.logger.error(`[cron:in_progress] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Auto-complete — every 5 minutes ───────────────────────────────────────
  //
  // Marks in_progress / confirmed bookings as completed after endsAt has passed.
  // Uses BOOKING_AUTOCOMPLETE_DELAY_MINS for a configurable grace window.

  @Cron(CronExpression.EVERY_5_MINUTES)
  async completeFinishedBookings(): Promise<void> {
    try {
      for (const tenantId of await this.activeTenants()) {
        const count = await this.bookingService.autoCompleteExpired(tenantId);
        if (count) {
          this.logger.log(`[cron:complete] tenant=${tenantId} count=${count}`);
        }
      }
    } catch (err) {
      this.logger.error(`[cron:complete] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Auto no-show — every 5 minutes ────────────────────────────────────────
  //
  // Marks confirmed bookings with no check-in as no_show after
  // BOOKING_NO_SHOW_GRACE_MINS past startsAt.

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markNoShows(): Promise<void> {
    try {
      for (const tenantId of await this.activeTenants()) {
        const count = await this.bookingService.autoMarkNoShows(tenantId);
        if (count) {
          this.logger.log(`[cron:no_show] tenant=${tenantId} count=${count}`);
        }
      }
    } catch (err) {
      this.logger.error(`[cron:no_show] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Stale slot reservation expiry — every 5 minutes ──────────────────────
  //
  // H-2 FIX: SlotService.expireStaleReservations() releases slot rows where
  // reservedUntil < now() but the booking-level expiry may have already
  // freed the booking record. This sweeper cleans up any orphaned slot
  // reservations that slipped through the booking-level expiry (e.g. due
  // to a race between the two timers or a booking record deleted directly).
  // Also handles the 30→TTL alignment gap closed in booking.service.ts.

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleSlotReservations(): Promise<void> {
    try {
      for (const tenantId of await this.activeTenants()) {
        const count = await this.slotService.expireStaleReservations(tenantId);
        if (count) {
          this.logger.log(`[cron:slot_expiry] tenant=${tenantId} released=${count}`);
        }
      }
    } catch (err) {
      this.logger.error(`[cron:slot_expiry] Sweep failed — ${(err as Error).message}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Returns distinct tenantIds that have active (non-deleted) bookings.
   * Uses a raw query for efficiency — avoids loading full entities.
   * Result is cached implicitly per cron invocation (no cross-invocation state).
   */
  private async activeTenants(): Promise<string[]> {
    const rows = await this.dataSource.query<{ tenant_id: string }[]>(
      `SELECT DISTINCT tenant_id
       FROM bookings
       WHERE is_deleted = false
         AND status NOT IN ('cancelled', 'completed', 'refunded', 'expired', 'no_show', 'rescheduled')
       LIMIT 200`,
    );
    return rows.map((r) => r.tenant_id);
  }
}

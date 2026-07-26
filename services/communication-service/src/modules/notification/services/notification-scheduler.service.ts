import { Injectable, Logger } from '@nestjs/common';
import { Cron }               from '@nestjs/schedule';
import { InjectDataSource }   from '@nestjs/typeorm';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { DataSource }         from 'typeorm';
import { EventRegistry }      from '@spancle/event-contracts';
import { ConfigService }      from '@nestjs/config';

/**
 * NotificationSchedulerService
 *
 * Runs cross-tenant sweeps against the bookings and memberships tables
 * to dispatch reminder and expiry notifications.
 *
 * All queries are parameterized and always include tenant_id to ensure
 * tenant isolation even in cross-tenant sweeps.
 *
 * Sweep cadence:
 *   24h reminder    — every 30 minutes (catches bookings 23h 30m – 24h from now)
 *   2h reminder     — every 10 minutes (catches bookings 1h 50m – 2h from now)
 *   Membership expiry — daily at 08:00 UTC
 *
 * Deduplication:
 *   Uses the 'notification_sent_flags' column convention — marks bookings as
 *   having had a reminder sent to prevent double-fire across cron ticks.
 *   Implemented via IN-clause against notifications table:
 *     "has no notification of this type already sent today".
 *
 * Configuration:
 *   NOTIFICATION_REMINDER_BATCH  (default 100) — bookings per sweep
 *   MEMBERSHIP_EXPIRY_DAYS_AHEAD (default 7)   — days before expiry to alert
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private readonly batch:        number;
  private readonly expiryDays:   number;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly eventEmitter:  EventEmitter2,
    private readonly config:        ConfigService,
  ) {
    this.batch      = this.config.get<number>('NOTIFICATION_REMINDER_BATCH', 100);
    this.expiryDays = this.config.get<number>('MEMBERSHIP_EXPIRY_DAYS_AHEAD', 7);
  }

  // ── 24h booking reminder — every 30 minutes ────────────────────────────────

  @Cron('*/30 * * * *')
  async sweep24hReminders(): Promise<void> {
    try {
      const rows = await this.ds.query<Array<Record<string, unknown>>>(`
        SELECT
          b.id, b.tenant_id, b.reference,
          b.customer_name, b.customer_email, b.user_id,
          b.starts_at, b.duration_mins,
          b.court_id, b.venue_id
        FROM bookings b
        WHERE b.status = 'confirmed'
          AND b.is_deleted = FALSE
          AND b.starts_at BETWEEN
              NOW() + INTERVAL '23 hours 30 minutes'
              AND
              NOW() + INTERVAL '24 hours 30 minutes'
          -- Dedup: no 24h reminder already queued/delivered today
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.tenant_id = b.tenant_id
              AND n.template_slug = 'booking_reminder_email'
              AND n.name LIKE 'Reminder: booking tomorrow%'
              AND n.name LIKE '%' || b.reference || '%'
              AND n.status IN ('queued','processing','delivered')
              AND n.created_at > NOW() - INTERVAL '25 hours'
          )
        ORDER BY b.starts_at ASC
        LIMIT $1
      `, [this.batch]);

      if (!rows.length) return;
      this.logger.log(`[24h-reminder] Dispatching ${rows.length} reminder(s)`);

      for (const row of rows) {
        this.eventEmitter.emit(EventRegistry.BOOKING_REMINDER_24H, {
          id:          `reminder-24h-${String(row['id'])}`,
          channel:     EventRegistry.BOOKING_REMINDER_24H,
          version:     '1',
          tenantId:    String(row['tenant_id']),
          occurredAt:  new Date().toISOString(),
          producer:    'notification-scheduler',
          payload: {
            bookingId:    row['id'],
            reference:    row['reference'],
            customerName:  row['customer_name'],
            customerEmail: row['customer_email'],
            userId:       row['user_id'],
            startsAt:     row['starts_at'],
            durationMins: row['duration_mins'],
          },
        });
      }
    } catch (err: unknown) {
      this.logger.error(`[24h-reminder] Sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 2h booking reminder — every 10 minutes ─────────────────────────────────

  @Cron('*/10 * * * *')
  async sweep2hReminders(): Promise<void> {
    try {
      const rows = await this.ds.query<Array<Record<string, unknown>>>(`
        SELECT
          b.id, b.tenant_id, b.reference,
          b.customer_name, b.customer_email, b.user_id,
          b.starts_at, b.duration_mins,
          b.court_id, b.venue_id
        FROM bookings b
        WHERE b.status = 'confirmed'
          AND b.is_deleted = FALSE
          AND b.starts_at BETWEEN
              NOW() + INTERVAL '1 hour 50 minutes'
              AND
              NOW() + INTERVAL '2 hours 10 minutes'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.tenant_id = b.tenant_id
              AND n.template_slug = 'booking_reminder_email'
              AND n.name LIKE 'Reminder: booking in 2 hours%'
              AND n.name LIKE '%' || b.reference || '%'
              AND n.status IN ('queued','processing','delivered')
              AND n.created_at > NOW() - INTERVAL '3 hours'
          )
        ORDER BY b.starts_at ASC
        LIMIT $1
      `, [this.batch]);

      if (!rows.length) return;
      this.logger.log(`[2h-reminder] Dispatching ${rows.length} reminder(s)`);

      for (const row of rows) {
        this.eventEmitter.emit(EventRegistry.BOOKING_REMINDER_2H, {
          id:          `reminder-2h-${String(row['id'])}`,
          channel:     EventRegistry.BOOKING_REMINDER_2H,
          version:     '1',
          tenantId:    String(row['tenant_id']),
          occurredAt:  new Date().toISOString(),
          producer:    'notification-scheduler',
          payload: {
            bookingId:    row['id'],
            reference:    row['reference'],
            customerName:  row['customer_name'],
            customerEmail: row['customer_email'],
            userId:       row['user_id'],
            startsAt:     row['starts_at'],
            durationMins: row['duration_mins'],
          },
        });
      }
    } catch (err: unknown) {
      this.logger.error(`[2h-reminder] Sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Membership expiry reminder — daily at 08:00 UTC ───────────────────────

  @Cron('0 8 * * *')
  async sweepMembershipExpiry(): Promise<void> {
    try {
      const rows = await this.ds.query<Array<Record<string, unknown>>>(`
        SELECT
          m.id, m.tenant_id, m.member_number,
          m.user_id, m.expires_at, m.plan_id,
          c.full_name     AS customer_name,
          c.email         AS customer_email
        FROM memberships m
        LEFT JOIN customers c ON c.user_id = m.user_id AND c.tenant_id = m.tenant_id AND c.is_deleted = FALSE
        WHERE m.status IN ('active','trial')
          AND m.is_deleted = FALSE
          AND m.expires_at BETWEEN
              NOW()
              AND
              NOW() + ($1 || ' days')::interval
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.tenant_id = m.tenant_id
              AND n.template_slug = 'membership_expiry_email'
              AND n.name LIKE '%' || m.member_number || '%'
              AND n.status IN ('queued','processing','delivered')
              AND n.created_at > NOW() - INTERVAL '20 hours'
          )
        ORDER BY m.expires_at ASC
        LIMIT $2
      `, [this.expiryDays, this.batch]);

      if (!rows.length) return;
      this.logger.log(`[membership-expiry] Dispatching ${rows.length} expiry reminder(s)`);

      for (const row of rows) {
        const expiresAt   = new Date(String(row['expires_at']));
        const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);

        this.eventEmitter.emit(EventRegistry.MEMBERSHIP_EXPIRY_REMINDER, {
          id:          `membership-expiry-${String(row['id'])}`,
          channel:     EventRegistry.MEMBERSHIP_EXPIRY_REMINDER,
          version:     '1',
          tenantId:    String(row['tenant_id']),
          occurredAt:  new Date().toISOString(),
          producer:    'notification-scheduler',
          payload: {
            membershipId:  row['id'],
            memberNumber:  row['member_number'],
            userId:        row['user_id'],
            expiresAt:     row['expires_at'],
            planName:      row['plan_id'],
            daysRemaining: String(daysRemaining),
            customerName:  row['customer_name']  ?? '',
            customerEmail: row['customer_email'] ?? '',
          },
        });
      }
    } catch (err: unknown) {
      this.logger.error(`[membership-expiry] Sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

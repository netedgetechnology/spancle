import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddPerformanceIndexes1722500000000
 *
 * Adds composite indexes identified during production hardening review.
 *
 * Bookings:
 *   - (tenant_id, starts_at, status) — reminder scheduler sweeps filter by time range + status
 *   - (tenant_id, starts_at) partial WHERE is_deleted=FALSE — calendar/upcoming queries
 *   - (tenant_id, user_id, starts_at) — "my upcoming bookings" query
 *
 * These queries appear in:
 *   - NotificationSchedulerService.sweep24hReminders()
 *   - NotificationSchedulerService.sweep2hReminders()
 *   - BookingSchedulerService (no-show, auto-complete sweeps)
 *   - fetchMyBookings() on the consumer portal
 *
 * All indexes use CREATE INDEX IF NOT EXISTS — safe to replay.
 */
export class AddPerformanceIndexes1722500000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1722500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Reminder scheduler: WHERE status='confirmed' AND starts_at BETWEEN x AND y
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_starts
        ON bookings (tenant_id, status, starts_at)
        WHERE is_deleted = FALSE
    `);

    // Calendar and upcoming queries: ORDER BY starts_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant_starts
        ON bookings (tenant_id, starts_at)
        WHERE is_deleted = FALSE
    `);

    // Consumer portal "my bookings": WHERE user_id=X ORDER BY starts_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant_user_starts
        ON bookings (tenant_id, user_id, starts_at)
        WHERE is_deleted = FALSE AND user_id IS NOT NULL
    `);

    // Membership sweep: WHERE status IN ('active','trial') AND expires_at BETWEEN x AND y
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_memberships_tenant_status_expires
        ON memberships (tenant_id, status, expires_at)
        WHERE is_deleted = FALSE AND expires_at IS NOT NULL
    `);

    // Notification dedup check in scheduler: template_slug + created_at range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_tenant_slug_created
        ON notifications (tenant_id, template_slug, created_at)
        WHERE status IN ('queued', 'processing', 'delivered') AND is_deleted = FALSE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_tenant_slug_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_tenant_status_expires`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_tenant_user_starts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_tenant_starts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_tenant_status_starts`);
  }
}

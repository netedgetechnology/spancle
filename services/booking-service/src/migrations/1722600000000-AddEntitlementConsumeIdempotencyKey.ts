import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddEntitlementConsumeIdempotencyKey1722600000000
 *
 * CB-3 fix: makes entitlement consumption idempotent by adding a unique
 * constraint on (tenant_id, reference_type, reference_id) filtered to
 * 'consume' transaction rows.
 *
 * Without this, a double-call to BookingService.confirm() (e.g. HTTP retry)
 * could deduct two membership units for the same booking even though the
 * pessimistic row lock is held — the lock only prevents concurrent balance
 * reads, not the insertion of duplicate transaction rows.
 *
 * The constraint is a UNIQUE INDEX with a WHERE clause so it only applies to
 * 'consume' type rows where reference_id IS NOT NULL.  Refund, reset, and
 * adjustment rows are unaffected.
 *
 * Partial unique index rather than a table constraint allows the WHERE clause.
 * PostgreSQL enforces it exactly as a unique constraint for matching rows.
 */
export class AddEntitlementConsumeIdempotencyKey1722600000000 implements MigrationInterface {
  name = 'AddEntitlementConsumeIdempotencyKey1722600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        uq_membership_txn_consume_reference
      ON membership_transactions (tenant_id, reference_type, reference_id)
      WHERE transaction_type = 'consume'
        AND reference_id    IS NOT NULL
        AND reference_type  IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_membership_txn_consume_reference
    `);
  }
}

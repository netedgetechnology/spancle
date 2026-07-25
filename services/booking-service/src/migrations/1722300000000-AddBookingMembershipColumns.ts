import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddBookingMembershipColumns1722300000000
 *
 * Adds membership-related tracking columns to the bookings table:
 *   membership_id          — FK to memberships (nullable, backward-compatible)
 *   entitlement_type       — which benefit type was consumed (e.g. 'court_credit')
 *   entitlement_txn_id     — FK to the membership_transactions row for this consumption
 *   discount_minor         — membership/wallet discount applied (integer minor units)
 *   wallet_amount_minor    — amount paid from customer wallet (integer minor units)
 *
 * All columns nullable — existing bookings are unaffected.
 */
export class AddBookingMembershipColumns1722300000000 implements MigrationInterface {
  name = 'AddBookingMembershipColumns1722300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS membership_id       UUID          NULL,
        ADD COLUMN IF NOT EXISTS entitlement_type    VARCHAR(80)   NULL,
        ADD COLUMN IF NOT EXISTS entitlement_txn_id  UUID          NULL,
        ADD COLUMN IF NOT EXISTS discount_minor      INT           NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS wallet_amount_minor INT           NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_membership_id
        ON bookings (tenant_id, membership_id)
        WHERE is_deleted = FALSE AND membership_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_membership_id`);
    await queryRunner.query(`
      ALTER TABLE bookings
        DROP COLUMN IF EXISTS wallet_amount_minor,
        DROP COLUMN IF EXISTS discount_minor,
        DROP COLUMN IF EXISTS entitlement_txn_id,
        DROP COLUMN IF EXISTS entitlement_type,
        DROP COLUMN IF EXISTS membership_id
    `);
  }
}

import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * CreateBookingRules1722100000000
 *
 * Creates the booking_rules table with all scope-aware constraint columns.
 * Unique partial index prevents duplicate scope entries per tenant.
 */
export class CreateBookingRules1722100000000 implements MigrationInterface {
  name = 'CreateBookingRules1722100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_rules (
        id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id                UUID          NOT NULL,
        scope                    VARCHAR(20)   NOT NULL DEFAULT 'tenant',
        branch_id                UUID          NULL,
        sport_id                 UUID          NULL,
        court_id                 UUID          NULL,
        name                     VARCHAR(150)  NOT NULL,
        description              TEXT          NULL,
        is_active                BOOLEAN       NOT NULL DEFAULT TRUE,

        -- Advance booking window
        max_advance_booking_mins INT           NULL,
        min_notice_mins          INT           NULL,

        -- Duration
        min_duration_mins        INT           NULL,
        max_duration_mins        INT           NULL,

        -- Booking limits per customer
        max_bookings_per_day     INT           NULL,
        max_bookings_per_week    INT           NULL,
        max_bookings_per_month   INT           NULL,

        -- Restrictions
        members_only             BOOLEAN       NOT NULL DEFAULT FALSE,
        min_age_years            INT           NULL,
        max_age_years            INT           NULL,

        -- Buffer time
        buffer_time_mins         INT           NULL,

        -- Cutoffs
        cancellation_cutoff_mins INT           NULL,
        reschedule_cutoff_mins   INT           NULL,
        grace_period_mins        INT           NULL,

        -- Blackout dates (jsonb array of ISO date strings)
        blackout_dates           JSONB         NOT NULL DEFAULT '[]',

        -- Soft delete + timestamps
        is_deleted               BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        deleted_at               TIMESTAMPTZ   NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_rules_tenant_id
        ON booking_rules (tenant_id)
        WHERE is_deleted = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_rules_tenant_scope
        ON booking_rules (tenant_id, scope)
        WHERE is_deleted = FALSE
    `);

    /* Unique constraint: one rule set per scope combination per tenant.
       Uses a partial unique index so soft-deleted rows do not block recreation. */
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_rules_scope
        ON booking_rules (tenant_id, scope,
          COALESCE(branch_id::text, ''),
          COALESCE(sport_id::text,  ''),
          COALESCE(court_id::text,  ''))
        WHERE is_deleted = FALSE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_booking_rules_scope`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_booking_rules_tenant_scope`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_booking_rules_tenant_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_rules`);
  }
}

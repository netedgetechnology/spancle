import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddNotificationDeliveryFields1722000002000
 *
 * Adds delivery-tracking columns to the notifications table:
 *   channel, recipient_email, template_slug, locale, variables,
 *   status, retry_count, provider_ref, queue_job_id, error_message,
 *   sent_at, failed_at
 *
 * Drops the scaffolding-only description column (never used).
 */
export class AddNotificationDeliveryFields1722000002000 implements MigrationInterface {
  name = 'AddNotificationDeliveryFields1722000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS channel          VARCHAR(20)   NOT NULL DEFAULT 'email',
        ADD COLUMN IF NOT EXISTS recipient_email  VARCHAR(254)  NULL,
        ADD COLUMN IF NOT EXISTS template_slug    VARCHAR(100)  NULL,
        ADD COLUMN IF NOT EXISTS locale           VARCHAR(10)   NOT NULL DEFAULT 'en',
        ADD COLUMN IF NOT EXISTS variables        JSONB         NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS status           VARCHAR(20)   NOT NULL DEFAULT 'queued',
        ADD COLUMN IF NOT EXISTS retry_count      INT           NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS provider_ref     VARCHAR(255)  NULL,
        ADD COLUMN IF NOT EXISTS queue_job_id     VARCHAR(100)  NULL,
        ADD COLUMN IF NOT EXISTS error_message    TEXT          NULL,
        ADD COLUMN IF NOT EXISTS sent_at          TIMESTAMPTZ   NULL,
        ADD COLUMN IF NOT EXISTS failed_at        TIMESTAMPTZ   NULL
    `);

    await queryRunner.query(`
      ALTER TABLE notifications
        DROP COLUMN IF EXISTS description
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_tenant_status
        ON notifications (tenant_id, status) WHERE is_deleted = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_tenant_recipient
        ON notifications (tenant_id, recipient_email) WHERE is_deleted = FALSE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_tenant_recipient`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_tenant_status`);

    await queryRunner.query(`
      ALTER TABLE notifications
        DROP COLUMN IF EXISTS failed_at,
        DROP COLUMN IF EXISTS sent_at,
        DROP COLUMN IF EXISTS error_message,
        DROP COLUMN IF EXISTS queue_job_id,
        DROP COLUMN IF EXISTS provider_ref,
        DROP COLUMN IF EXISTS retry_count,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS variables,
        DROP COLUMN IF EXISTS locale,
        DROP COLUMN IF EXISTS template_slug,
        DROP COLUMN IF EXISTS recipient_email,
        DROP COLUMN IF EXISTS channel,
        ADD COLUMN IF NOT EXISTS description TEXT NULL
    `);
  }
}

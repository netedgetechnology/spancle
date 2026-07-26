"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCustomerAndLinkBookings1722200000000 = void 0;
class CreateCustomerAndLinkBookings1722200000000 {
    constructor() {
        this.name = 'CreateCustomerAndLinkBookings1722200000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id            UUID          NOT NULL,
        branch_id            UUID          NULL,
        user_id              UUID          NULL,
        parent_customer_id   UUID          NULL,

        first_name           VARCHAR(100)  NOT NULL,
        last_name            VARCHAR(100)  NOT NULL,
        full_name            VARCHAR(255)  NOT NULL,

        gender               VARCHAR(20)   NULL,
        date_of_birth        DATE          NULL,

        phone                VARCHAR(30)   NULL,
        email                VARCHAR(254)  NULL,
        emergency_contact    JSONB         NULL,
        address              JSONB         NULL,

        profile_photo        TEXT          NULL,
        notes                TEXT          NULL,

        status               VARCHAR(20)   NOT NULL DEFAULT 'active',
        is_guest             BOOLEAN       NOT NULL DEFAULT FALSE,
        wallet_balance_minor INT           NOT NULL DEFAULT 0,

        is_deleted           BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        deleted_at           TIMESTAMPTZ   NULL
      )
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_id      ON customers (tenant_id) WHERE is_deleted = FALSE`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_email   ON customers (tenant_id, email) WHERE is_deleted = FALSE`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone   ON customers (tenant_id, phone) WHERE is_deleted = FALSE`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_user    ON customers (tenant_id, user_id) WHERE is_deleted = FALSE`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_status  ON customers (tenant_id, status) WHERE is_deleted = FALSE`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_parent         ON customers (tenant_id, parent_customer_id) WHERE is_deleted = FALSE`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm
        ON customers USING gin (full_name gin_trgm_ops)
    `);
        await queryRunner.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS customer_id UUID NULL
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
        ON bookings (tenant_id, customer_id) WHERE is_deleted = FALSE
    `);
        await queryRunner.query(`
      ALTER TABLE memberships
        ADD COLUMN IF NOT EXISTS customer_id UUID NULL
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_memberships_customer_id
        ON memberships (tenant_id, customer_id) WHERE is_deleted = FALSE
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_customer_id`);
        await queryRunner.query(`ALTER TABLE memberships DROP COLUMN IF EXISTS customer_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_customer_id`);
        await queryRunner.query(`ALTER TABLE bookings DROP COLUMN IF EXISTS customer_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_full_name_trgm`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_parent`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_tenant_status`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_tenant_user`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_tenant_phone`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_tenant_email`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_tenant_id`);
        await queryRunner.query(`DROP TABLE IF EXISTS customers`);
    }
}
exports.CreateCustomerAndLinkBookings1722200000000 = CreateCustomerAndLinkBookings1722200000000;
//# sourceMappingURL=1722200000000-CreateCustomerAndLinkBookings.js.map
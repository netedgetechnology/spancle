"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWaitlist1722400000000 = void 0;
class CreateWaitlist1722400000000 {
    constructor() {
        this.name = 'CreateWaitlist1722400000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID          NOT NULL,
        slot_id          UUID          NOT NULL,
        court_id         UUID          NOT NULL,
        branch_id        UUID          NOT NULL,

        user_id          UUID          NULL,
        customer_id      UUID          NULL,
        customer_name    VARCHAR(255)  NOT NULL,
        customer_email   VARCHAR(254)  NULL,
        customer_phone   VARCHAR(30)   NULL,

        position         INT           NOT NULL,
        status           VARCHAR(20)   NOT NULL DEFAULT 'waiting',

        promoted_at      TIMESTAMPTZ   NULL,
        promoted_until   TIMESTAMPTZ   NULL,
        booking_id       UUID          NULL,
        notes            TEXT          NULL,

        is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        deleted_at       TIMESTAMPTZ   NULL
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_slot_status
        ON waitlist_entries (tenant_id, slot_id, status)
        WHERE is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_slot_position
        ON waitlist_entries (tenant_id, slot_id, position)
        WHERE is_deleted = FALSE AND status = 'waiting'
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_user
        ON waitlist_entries (tenant_id, user_id)
        WHERE is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_customer
        ON waitlist_entries (tenant_id, customer_id)
        WHERE is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_promoted_until
        ON waitlist_entries (tenant_id, status, promoted_until)
        WHERE status = 'promoted' AND is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_waitlist_slot_user_waiting
        ON waitlist_entries (tenant_id, slot_id, user_id)
        WHERE status = 'waiting' AND user_id IS NOT NULL AND is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_waitlist_slot_customer_waiting
        ON waitlist_entries (tenant_id, slot_id, customer_id)
        WHERE status = 'waiting' AND customer_id IS NOT NULL AND is_deleted = FALSE
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS ux_waitlist_slot_customer_waiting`);
        await queryRunner.query(`DROP INDEX IF EXISTS ux_waitlist_slot_user_waiting`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_waitlist_promoted_until`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_waitlist_customer`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_waitlist_user`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_waitlist_slot_position`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_waitlist_slot_status`);
        await queryRunner.query(`DROP TABLE IF EXISTS waitlist_entries`);
    }
}
exports.CreateWaitlist1722400000000 = CreateWaitlist1722400000000;
//# sourceMappingURL=1722400000000-CreateWaitlist.js.map
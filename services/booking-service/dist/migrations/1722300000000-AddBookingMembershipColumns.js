"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBookingMembershipColumns1722300000000 = void 0;
class AddBookingMembershipColumns1722300000000 {
    constructor() {
        this.name = 'AddBookingMembershipColumns1722300000000';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
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
exports.AddBookingMembershipColumns1722300000000 = AddBookingMembershipColumns1722300000000;
//# sourceMappingURL=1722300000000-AddBookingMembershipColumns.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPerformanceIndexes1722500000000 = void 0;
class AddPerformanceIndexes1722500000000 {
    constructor() {
        this.name = 'AddPerformanceIndexes1722500000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_starts
        ON bookings (tenant_id, status, starts_at)
        WHERE is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant_starts
        ON bookings (tenant_id, starts_at)
        WHERE is_deleted = FALSE
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant_user_starts
        ON bookings (tenant_id, user_id, starts_at)
        WHERE is_deleted = FALSE AND user_id IS NOT NULL
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_memberships_tenant_status_expires
        ON memberships (tenant_id, status, expires_at)
        WHERE is_deleted = FALSE AND expires_at IS NOT NULL
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_tenant_slug_created
        ON notifications (tenant_id, template_slug, created_at)
        WHERE status IN ('queued', 'processing', 'delivered') AND is_deleted = FALSE
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_tenant_slug_created`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_tenant_status_expires`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_tenant_user_starts`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_tenant_starts`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_tenant_status_starts`);
    }
}
exports.AddPerformanceIndexes1722500000000 = AddPerformanceIndexes1722500000000;
//# sourceMappingURL=1722500000000-AddPerformanceIndexes.js.map
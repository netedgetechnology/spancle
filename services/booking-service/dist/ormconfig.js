"use strict";
/**
 * TypeORM DataSource — booking-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const booking_entity_1 = require("./modules/booking/entities/booking.entity");
const booking_log_entity_1 = require("./modules/booking/entities/booking-log.entity");
const booking_payment_entity_1 = require("./modules/booking/entities/booking-payment.entity");
const booking_refund_entity_1 = require("./modules/booking/entities/booking-refund.entity");
const slot_entity_1 = require("./modules/slot/entities/slot.entity");
const pricing_rule_entity_1 = require("./modules/slot/entities/pricing-rule.entity");
const slot_template_entity_1 = require("./modules/slot/entities/slot-template.entity");
const blackout_entity_1 = require("./modules/slot/entities/blackout.entity");
const holiday_entity_1 = require("./modules/slot/entities/holiday.entity");
const venue_entity_1 = require("./modules/venue/entities/venue.entity");
const qr_token_entity_1 = require("./modules/qr/entities/qr-token.entity");
const qr_scan_log_entity_1 = require("./modules/qr/entities/qr-scan-log.entity");
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env['DATABASE_URL'],
    entities: [
        booking_entity_1.BookingEntity,
        booking_log_entity_1.BookingLogEntity,
        booking_payment_entity_1.BookingPaymentEntity,
        booking_refund_entity_1.BookingRefundEntity,
        slot_entity_1.SlotEntity,
        pricing_rule_entity_1.PricingRuleEntity,
        slot_template_entity_1.SlotTemplateEntity,
        blackout_entity_1.BlackoutEntity,
        holiday_entity_1.HolidayEntity,
        venue_entity_1.VenueEntity,
        qr_token_entity_1.QrTokenEntity,
        qr_scan_log_entity_1.QrScanLogEntity,
    ],
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: ['error', 'migration'],
    ssl: process.env['DATABASE_SSL'] === 'true'
        ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
        : false,
});
exports.default = dataSource;
//# sourceMappingURL=ormconfig.js.map
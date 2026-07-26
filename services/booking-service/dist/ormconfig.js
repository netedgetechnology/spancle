"use strict";
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
const booking_rules_entity_1 = require("./modules/booking-rules/entities/booking-rules.entity");
const customer_entity_1 = require("./modules/customer/entities/customer.entity");
const _1722100000000_CreateBookingRules_1 = require("./migrations/1722100000000-CreateBookingRules");
const _1722200000000_CreateCustomerAndLinkBookings_1 = require("./migrations/1722200000000-CreateCustomerAndLinkBookings");
const _1722300000000_AddBookingMembershipColumns_1 = require("./migrations/1722300000000-AddBookingMembershipColumns");
const _1722400000000_CreateWaitlist_1 = require("./migrations/1722400000000-CreateWaitlist");
const waitlist_entry_entity_1 = require("./modules/waitlist/entities/waitlist-entry.entity");
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
        booking_rules_entity_1.BookingRulesEntity,
        customer_entity_1.CustomerEntity,
        waitlist_entry_entity_1.WaitlistEntryEntity,
    ],
    migrations: [_1722100000000_CreateBookingRules_1.CreateBookingRules1722100000000, _1722200000000_CreateCustomerAndLinkBookings_1.CreateCustomerAndLinkBookings1722200000000, _1722300000000_AddBookingMembershipColumns_1.AddBookingMembershipColumns1722300000000, _1722400000000_CreateWaitlist_1.CreateWaitlist1722400000000],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: ['error', 'migration'],
    ssl: process.env['DATABASE_SSL'] === 'true'
        ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
        : false,
});
exports.default = dataSource;
//# sourceMappingURL=ormconfig.js.map
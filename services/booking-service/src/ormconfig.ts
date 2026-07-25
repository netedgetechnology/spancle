/**
 * TypeORM DataSource — booking-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { BookingEntity }        from './modules/booking/entities/booking.entity';
import { BookingLogEntity }     from './modules/booking/entities/booking-log.entity';
import { BookingPaymentEntity } from './modules/booking/entities/booking-payment.entity';
import { BookingRefundEntity }  from './modules/booking/entities/booking-refund.entity';
import { SlotEntity }           from './modules/slot/entities/slot.entity';
import { PricingRuleEntity }    from './modules/slot/entities/pricing-rule.entity';
import { SlotTemplateEntity }   from './modules/slot/entities/slot-template.entity';
import { BlackoutEntity }       from './modules/slot/entities/blackout.entity';
import { HolidayEntity }        from './modules/slot/entities/holiday.entity';
import { VenueEntity }          from './modules/venue/entities/venue.entity';
import { QrTokenEntity }        from './modules/qr/entities/qr-token.entity';
import { QrScanLogEntity }      from './modules/qr/entities/qr-scan-log.entity';
import { BookingRulesEntity }   from './modules/booking-rules/entities/booking-rules.entity';
import { CreateBookingRules1722100000000 } from './migrations/1722100000000-CreateBookingRules';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    BookingEntity,
    BookingLogEntity,
    BookingPaymentEntity,
    BookingRefundEntity,
    SlotEntity,
    PricingRuleEntity,
    SlotTemplateEntity,
    BlackoutEntity,
    HolidayEntity,
    VenueEntity,
    QrTokenEntity,
    QrScanLogEntity,
    BookingRulesEntity,
  ],
  migrations:         [CreateBookingRules1722100000000],
  migrationsTableName: 'typeorm_migrations',
  synchronize:        false,
  logging:            ['error', 'migration'],
  ssl: process.env['DATABASE_SSL'] === 'true'
    ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
    : false,
});

export default dataSource;

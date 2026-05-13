/**
 * TypeORM DataSource — finance-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { InvoiceEntity }                   from './modules/invoice/entities/invoice.entity';
import { InvoiceSequenceEntity }           from './modules/invoice/entities/invoice-sequence.entity';
import { PaymentEntity }                   from './modules/payment/entities/payment.entity';
import { PaymentRefundEntity }             from './modules/payment/entities/payment-refund.entity';
import { PaymentReconciliationLogEntity }  from './modules/payment/entities/payment-reconciliation-log.entity';
import { WalletEntity }                    from './modules/wallet/entities/wallet.entity';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    InvoiceEntity,
    InvoiceSequenceEntity,
    PaymentEntity,
    PaymentRefundEntity,
    PaymentReconciliationLogEntity,
    WalletEntity,
  ],
  migrations:         ['dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  synchronize:        false,
  logging:            ['error', 'migration'],
  ssl: process.env['DATABASE_SSL'] === 'true'
    ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
    : false,
});

export default dataSource;

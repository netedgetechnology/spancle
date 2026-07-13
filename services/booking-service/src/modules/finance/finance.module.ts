import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountingPeriodEntity }   from './entities/accounting-period.entity';
import { ChartOfAccountEntity }     from './entities/chart-of-account.entity';
import { JournalEntryEntity, JournalLineEntity } from './entities/journal.entity';
import { TaxRateEntity }            from './entities/tax-rate.entity';
import { InvoiceEntity }            from './entities/invoice.entity';
import { InvoiceLineEntity, InvoiceTaxEntity, InvoiceReferenceEntity } from './entities/invoice-line.entity';
import { PaymentEntity, PaymentAllocationEntity } from './entities/payment.entity';
import { DisputeEntity }            from './entities/dispute.entity';
import { RefundEntity, RefundLineAllocationEntity } from './entities/refund.entity';

import { AccountingPeriodRepository } from './repositories/accounting-period.repository';
import { ChartOfAccountRepository }   from './repositories/chart-of-account.repository';
import { JournalRepository }          from './repositories/journal.repository';
import { TaxRateRepository }          from './repositories/tax-rate.repository';
import { InvoiceRepository }          from './repositories/invoice.repository';
import { PaymentRepository }          from './repositories/payment.repository';
import { DisputeRepository }          from './repositories/dispute.repository';
import { RefundRepository }           from './repositories/refund.repository';

import { AccountingPeriodService } from './services/accounting-period.service';
import { DoubleEntryService }      from './services/double-entry.service';
import { TaxResolver }             from './services/tax-resolver.service';
import { ChartOfAccountService }   from './services/chart-of-account.service';
import { InvoiceService }          from './services/invoice.service';
import { PaymentService }          from './services/payment.service';
import { DisputeService }          from './services/dispute.service';
import { RefundService }           from './services/refund.service';

import { FinanceAdminController }  from './controllers/finance-admin.controller';
import { InvoiceAdminController }  from './controllers/invoice-admin.controller';
import { PaymentAdminController }  from './controllers/payment-admin.controller';
import { DisputeAdminController }  from './controllers/dispute-admin.controller';
import { RefundAdminController }   from './controllers/refund-admin.controller';
import { BookingFinanceListener }   from './listeners/booking-finance.listener';

/**
 * FinanceModule — Finance Engine domain boundary.
 *
 * Batch 7.1A: Accounting Periods, Chart of Accounts, Journal, Double Entry, Tax
 * Batch 7.1B: Invoice Foundation
 * Batch 7.2:  Payment Engine Foundation
 * Batch 7.3A: Disputes & Chargebacks
 * Batch 7.4:  Refund Engine
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingPeriodEntity,
      ChartOfAccountEntity,
      JournalEntryEntity,
      JournalLineEntity,
      TaxRateEntity,
      InvoiceEntity,
      InvoiceLineEntity,
      InvoiceTaxEntity,
      InvoiceReferenceEntity,
      PaymentEntity,
      PaymentAllocationEntity,
      DisputeEntity,
      RefundEntity,
      RefundLineAllocationEntity,
    ]),
  ],
  controllers: [
    FinanceAdminController,
    InvoiceAdminController,
    PaymentAdminController,
    DisputeAdminController,
    RefundAdminController,
  ],
  providers: [
    AccountingPeriodRepository,
    ChartOfAccountRepository,
    JournalRepository,
    TaxRateRepository,
    InvoiceRepository,
    PaymentRepository,
    DisputeRepository,
    RefundRepository,
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
    InvoiceService,
    PaymentService,
    DisputeService,
    RefundService,
    BookingFinanceListener,
  ],
  exports: [
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
    InvoiceService,
    PaymentService,
    DisputeService,
    RefundService,
    TaxRateRepository,
    JournalRepository,
    ChartOfAccountRepository,
    InvoiceRepository,
    PaymentRepository,
    DisputeRepository,
    RefundRepository,
  ],
})
export class FinanceModule {}

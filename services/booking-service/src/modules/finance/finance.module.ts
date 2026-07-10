import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountingPeriodEntity } from './entities/accounting-period.entity';
import { ChartOfAccountEntity }   from './entities/chart-of-account.entity';
import { JournalEntryEntity, JournalLineEntity } from './entities/journal.entity';
import { TaxRateEntity }          from './entities/tax-rate.entity';
import { InvoiceEntity }          from './entities/invoice.entity';
import {
  InvoiceLineEntity,
  InvoiceTaxEntity,
  InvoiceReferenceEntity,
} from './entities/invoice-line.entity';

import { AccountingPeriodRepository } from './repositories/accounting-period.repository';
import { ChartOfAccountRepository }   from './repositories/chart-of-account.repository';
import { JournalRepository }          from './repositories/journal.repository';
import { TaxRateRepository }          from './repositories/tax-rate.repository';
import { InvoiceRepository }          from './repositories/invoice.repository';

import { AccountingPeriodService } from './services/accounting-period.service';
import { DoubleEntryService }      from './services/double-entry.service';
import { TaxResolver }             from './services/tax-resolver.service';
import { ChartOfAccountService }   from './services/chart-of-account.service';
import { InvoiceService }          from './services/invoice.service';

import { FinanceAdminController }  from './controllers/finance-admin.controller';
import { InvoiceAdminController }  from './controllers/invoice-admin.controller';

/**
 * FinanceModule — Finance Engine domain boundary.
 *
 * Batch 7.1A: Core Accounting Foundation
 *   AccountingPeriodService, DoubleEntryService, TaxResolver, ChartOfAccountService
 *
 * Batch 7.1B: Invoice Foundation
 *   InvoiceService — draft(), finalise(), void(), findByReference(), findByNumber()
 *
 * Self-contained: no Booking, Membership, Pricing, or Slot dependencies.
 * Receives enriched business events; never calls other engines synchronously.
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
    ]),
  ],
  controllers: [
    FinanceAdminController,
    InvoiceAdminController,
  ],
  providers: [
    AccountingPeriodRepository,
    ChartOfAccountRepository,
    JournalRepository,
    TaxRateRepository,
    InvoiceRepository,
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
    InvoiceService,
  ],
  exports: [
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
    InvoiceService,
    TaxRateRepository,
    JournalRepository,
    ChartOfAccountRepository,
    InvoiceRepository,
  ],
})
export class FinanceModule {}

import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountingPeriodEntity } from './entities/accounting-period.entity';
import { ChartOfAccountEntity }   from './entities/chart-of-account.entity';
import { JournalEntryEntity, JournalLineEntity } from './entities/journal.entity';
import { TaxRateEntity }          from './entities/tax-rate.entity';

import { AccountingPeriodRepository } from './repositories/accounting-period.repository';
import { ChartOfAccountRepository }   from './repositories/chart-of-account.repository';
import { JournalRepository }          from './repositories/journal.repository';
import { TaxRateRepository }          from './repositories/tax-rate.repository';

import { AccountingPeriodService } from './services/accounting-period.service';
import { DoubleEntryService }      from './services/double-entry.service';
import { TaxResolver }             from './services/tax-resolver.service';
import { ChartOfAccountService }   from './services/chart-of-account.service';

import { FinanceAdminController }  from './controllers/finance-admin.controller';

/**
 * FinanceModule — Core Accounting Foundation (Batch 7.1A).
 *
 * Provides:
 *   AccountingPeriodService  — period open/close/lock, assertOpen() guard
 *   DoubleEntryService       — assertBalanced(), post(), reverse()
 *   TaxResolver              — inclusive/exclusive tax computation
 *   ChartOfAccountService    — CoA management + system account seeding
 *
 * Exports all four services so future Finance sub-modules (InvoiceModule,
 * PaymentModule, WalletModule) can import FinanceModule and use them.
 *
 * No Booking, Membership, Pricing, or Slot dependencies — Finance is
 * self-contained and only receives enriched business events.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingPeriodEntity,
      ChartOfAccountEntity,
      JournalEntryEntity,
      JournalLineEntity,
      TaxRateEntity,
    ]),
  ],
  controllers: [FinanceAdminController],
  providers: [
    AccountingPeriodRepository,
    ChartOfAccountRepository,
    JournalRepository,
    TaxRateRepository,
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
  ],
  exports: [
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
    TaxRateRepository,
    JournalRepository,
    ChartOfAccountRepository,
  ],
})
export class FinanceModule {}

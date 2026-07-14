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
import { BookingPaymentFinancePaymentMapEntity } from './entities/booking-payment-finance-payment-map.entity';
import { FinanceBookingRefundJobEntity }         from './entities/finance-booking-refund-job.entity';

import { AccountingPeriodRepository }         from './repositories/accounting-period.repository';
import { ChartOfAccountRepository }           from './repositories/chart-of-account.repository';
import { JournalRepository }                  from './repositories/journal.repository';
import { TaxRateRepository }                  from './repositories/tax-rate.repository';
import { InvoiceRepository }                  from './repositories/invoice.repository';
import { PaymentRepository }                  from './repositories/payment.repository';
import { DisputeRepository }                  from './repositories/dispute.repository';
import { RefundRepository }                   from './repositories/refund.repository';
import { PaymentCorrelationRepository }       from './repositories/payment-correlation.repository';
import { FinanceBookingRefundJobRepository }  from './repositories/finance-booking-refund-job.repository';

import { AccountingPeriodService }         from './services/accounting-period.service';
import { DoubleEntryService }              from './services/double-entry.service';
import { TaxResolver }                     from './services/tax-resolver.service';
import { ChartOfAccountService }           from './services/chart-of-account.service';
import { InvoiceService }                  from './services/invoice.service';
import { PaymentService }                  from './services/payment.service';
import { DisputeService }                  from './services/dispute.service';
import { RefundService }                   from './services/refund.service';
import { PaymentCorrelationService }       from './services/payment-correlation.service';
import { FinanceBookingRefundJobService }  from './services/finance-booking-refund-job.service';

import { FinanceAdminController }                    from './controllers/finance-admin.controller';
import { InvoiceAdminController }                    from './controllers/invoice-admin.controller';
import { PaymentAdminController }                    from './controllers/payment-admin.controller';
import { DisputeAdminController }                    from './controllers/dispute-admin.controller';
import { RefundAdminController }                     from './controllers/refund-admin.controller';
import { PaymentCorrelationAdminController }         from './controllers/payment-correlation-admin.controller';
import { FinanceBookingRefundJobAdminController }    from './controllers/finance-booking-refund-job-admin.controller';

import { BookingFinanceListener } from './listeners/booking-finance.listener';

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
      BookingPaymentFinancePaymentMapEntity,
      FinanceBookingRefundJobEntity,
    ]),
  ],
  controllers: [
    FinanceAdminController,
    InvoiceAdminController,
    PaymentAdminController,
    DisputeAdminController,
    RefundAdminController,
    PaymentCorrelationAdminController,
    FinanceBookingRefundJobAdminController,
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
    PaymentCorrelationRepository,
    FinanceBookingRefundJobRepository,
    AccountingPeriodService,
    DoubleEntryService,
    TaxResolver,
    ChartOfAccountService,
    InvoiceService,
    PaymentService,
    DisputeService,
    RefundService,
    PaymentCorrelationService,
    FinanceBookingRefundJobService,
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
    PaymentCorrelationService,
    FinanceBookingRefundJobService,
    TaxRateRepository,
    JournalRepository,
    ChartOfAccountRepository,
    InvoiceRepository,
    PaymentRepository,
    DisputeRepository,
    RefundRepository,
    PaymentCorrelationRepository,
    FinanceBookingRefundJobRepository,
  ],
})
export class FinanceModule {}

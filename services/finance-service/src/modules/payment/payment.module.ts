import { Module }                           from '@nestjs/common';
import { TypeOrmModule }                    from '@nestjs/typeorm';
import { PaymentController }               from './controllers/payment.controller';
import { PaymentService }                  from './services/payment.service';
import { PaymentRepository }               from './repositories/payment.repository';
import { PaymentRefundRepository }         from './repositories/payment-refund.repository';
import { PaymentEntity }                   from './entities/payment.entity';
import { PaymentRefundEntity }             from './entities/payment-refund.entity';
import { PaymentReconciliationLogEntity }  from './entities/payment-reconciliation-log.entity';
import { InvoiceRepository }              from '../invoice/repositories/invoice.repository';
import { InvoiceEntity }                  from '../invoice/entities/invoice.entity';
import { InvoiceSequenceEntity }          from '../invoice/entities/invoice-sequence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      PaymentRefundEntity,
      PaymentReconciliationLogEntity,
      InvoiceEntity,
      InvoiceSequenceEntity,
    ]),
  ],
  controllers: [PaymentController],
  providers:   [PaymentService, PaymentRepository, PaymentRefundRepository, InvoiceRepository],
  exports:     [PaymentService],
})
export class PaymentModule {}

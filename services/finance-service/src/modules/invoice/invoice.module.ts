import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoiceEntity }          from './entities/invoice.entity';
import { InvoiceSequenceEntity }  from './entities/invoice-sequence.entity';
import { InvoiceController }      from './controllers/invoice.controller';
import { InvoiceService }         from './services/invoice.service';
import { InvoiceRepository }      from './repositories/invoice.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity, InvoiceSequenceEntity]),
  ],
  controllers: [InvoiceController],
  providers:   [InvoiceService, InvoiceRepository],
  exports:     [InvoiceService],
})
export class InvoiceModule {}

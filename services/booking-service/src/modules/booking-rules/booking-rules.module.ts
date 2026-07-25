import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingRulesEntity }     from './entities/booking-rules.entity';
import { BookingRulesRepository } from './repositories/booking-rules.repository';
import { BookingRulesService }    from './services/booking-rules.service';
import { BookingRulesController } from './controllers/booking-rules.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([BookingRulesEntity])],
  controllers: [BookingRulesController],
  providers:   [BookingRulesRepository, BookingRulesService],
  exports:     [BookingRulesService],
})
export class BookingRulesModule {}

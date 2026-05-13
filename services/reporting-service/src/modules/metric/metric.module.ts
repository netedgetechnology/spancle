import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricController } from './controllers/metric.controller';
import { MetricService } from './services/metric.service';
import { MetricRepository } from './repositories/metric.repository';
import { MetricEntity } from './entities/metric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetricEntity])],
  controllers: [MetricController],
  providers: [MetricService, MetricRepository],
  exports: [MetricService],
})
export class MetricModule {}

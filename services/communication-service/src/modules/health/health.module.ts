import { Module }        from '@nestjs/common';
import { ConfigModule }  from '@nestjs/config';
import { BullModule }    from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController }    from './health.controller';
import { MetricsController }   from './metrics.controller';
import { QueueMetricsService } from './queue-metrics.service';
import { EmailModule }         from '../email/email.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule,
    BullModule.registerQueue({ name: 'email' }),
    EmailModule,
  ],
  controllers: [HealthController, MetricsController],
  providers:   [QueueMetricsService],
  exports:     [QueueMetricsService],
})
export class HealthModule {}

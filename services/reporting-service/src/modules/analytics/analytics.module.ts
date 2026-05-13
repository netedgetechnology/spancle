import { Module }              from '@nestjs/common';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsService }    from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers:   [AnalyticsRepository, AnalyticsService],
  exports:     [AnalyticsService],
})
export class AnalyticsModule {}

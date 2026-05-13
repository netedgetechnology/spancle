import { Module }  from '@nestjs/common';
import { ReportingRepository }  from './repositories/reporting.repository';
import { ReportingService }     from './services/reporting.service';
import { ReportingController }  from './controllers/reporting.controller';

@Module({
  controllers: [ReportingController],
  providers:   [ReportingRepository, ReportingService],
  exports:     [ReportingService],
})
export class ReportingModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity }    from './entities/subscription.entity';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionService }   from './services/subscription.service';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { PackageModule }          from '../package/package.module';
import { SuperAdminGuard }        from '../admin/guards/super-admin.guard';

@Module({
  imports:     [TypeOrmModule.forFeature([SubscriptionEntity]), PackageModule],
  controllers: [SubscriptionController],
  providers:   [SubscriptionService, SubscriptionRepository, SuperAdminGuard],
  exports:     [SubscriptionService],
})
export class SubscriptionModule {}

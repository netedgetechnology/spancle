import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MembershipPlanEntity }        from './entities/membership-plan.entity';
import { MembershipBenefitEntity }     from './entities/membership-benefit.entity';
import { MembershipEntity }            from './entities/membership.entity';
import { MembershipTransactionEntity } from './entities/membership-transaction.entity';
import { MembershipAuditLogEntity }    from './entities/membership-audit-log.entity';

import { MembershipPlanRepository } from './repositories/membership-plan.repository';
import { MembershipRepository }     from './repositories/membership.repository';

import { MembershipPlanService } from './services/membership-plan.service';
import { MembershipService }     from './services/membership.service';

import { MembershipPlanController } from './controllers/membership-plan.controller';
import { MembershipController }     from './controllers/membership.controller';

/**
 * MembershipModule — membership engine domain boundary.
 *
 * Self-contained: no imports from BookingModule, SlotModule, or PricingModule.
 * Other modules may import MembershipModule to access MembershipService
 * (e.g. to resolve member status for a booking).
 *
 * Schedulers (renewal sweeps, expiry, freeze lift, entitlement reset) are
 * added in Batch 6.2.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MembershipPlanEntity,
      MembershipBenefitEntity,
      MembershipEntity,
      MembershipTransactionEntity,
      MembershipAuditLogEntity,
    ]),
  ],
  controllers: [
    MembershipPlanController,
    MembershipController,
  ],
  providers: [
    MembershipPlanRepository,
    MembershipRepository,
    MembershipPlanService,
    MembershipService,
  ],
  exports: [MembershipService],
})
export class MembershipModule {}

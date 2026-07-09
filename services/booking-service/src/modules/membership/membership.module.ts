import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';

import { MembershipPlanEntity }        from './entities/membership-plan.entity';
import { MembershipBenefitEntity }     from './entities/membership-benefit.entity';
import { MembershipEntity }            from './entities/membership.entity';
import { MembershipTransactionEntity } from './entities/membership-transaction.entity';
import { MembershipAuditLogEntity }    from './entities/membership-audit-log.entity';
import { EntitlementBalanceEntity }    from './entities/entitlement-balance.entity';

import { MembershipPlanRepository } from './repositories/membership-plan.repository';
import { MembershipRepository }     from './repositories/membership.repository';
import { EntitlementRepository }    from './repositories/entitlement.repository';

import { MembershipPlanService }          from './services/membership-plan.service';
import { MembershipService }              from './services/membership.service';
import { MembershipSchedulerService }     from './services/membership-scheduler.service';
import { EntitlementService }             from './services/entitlement.service';
import { EntitlementSchedulerService }    from './services/entitlement-scheduler.service';

import { MembershipPlanController } from './controllers/membership-plan.controller';
import { MembershipController }     from './controllers/membership.controller';
import { EntitlementController }    from './controllers/entitlement.controller';

/**
 * MembershipModule — membership engine domain boundary.
 *
 * Self-contained: no imports from BookingModule, SlotModule, or PricingModule.
 * Other modules may import MembershipModule to access MembershipService and
 * EntitlementService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MembershipPlanEntity,
      MembershipBenefitEntity,
      MembershipEntity,
      MembershipTransactionEntity,
      MembershipAuditLogEntity,
      EntitlementBalanceEntity,
    ]),
  ],
  controllers: [
    MembershipPlanController,
    MembershipController,
    EntitlementController,
  ],
  providers: [
    MembershipPlanRepository,
    MembershipRepository,
    EntitlementRepository,
    MembershipPlanService,
    MembershipService,
    MembershipSchedulerService,
    EntitlementService,
    EntitlementSchedulerService,
  ],
  exports: [MembershipService, EntitlementService],
})
export class MembershipModule {}

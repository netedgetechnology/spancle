import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Cross-module imports (no circular dependency)
import { PlanModule }    from '../plan/plan.module';

// Entities
import { CommercialRuleEntity }              from './entities/commercial-rule.entity';
import { CommercialRuleVersionEntity }       from './entities/commercial-rule-version.entity';
import {
  CommercialDecisionSnapshotEntity,
  PackageVersionEntity,
}                                            from './entities/commercial-snapshot-and-package.entity';
import {
  CommercialProductEntity,
  ModuleRegistryEntity,
  PricingModelEntity,
}                                            from './entities/commercial-product-module-pricing.entity';
import {
  CommercialAuditEntity,
  FeatureFlagEntity,
  GatewayCredentialEntity,
  GatewayDefinitionEntity,
  PaymentOwnershipPolicyEntity,
  RevenueDistributionPolicyEntity,
}                                            from './entities/commercial-policy-gateway-flag-audit.entity';

// Repositories
import {
  CommercialAuditRepository,
  CommercialDecisionSnapshotRepository,
  CommercialProductRepository,
  CommercialRuleRepository,
  CommercialRuleVersionRepository,
  FeatureFlagRepository,
  GatewayCredentialRepository,
  GatewayDefinitionRepository,
  ModuleRegistryRepository,
  PackageVersionRepository,
  PaymentOwnershipPolicyRepository,
  PricingModelRepository,
  RevenueDistributionPolicyRepository,
}                                            from './commercial.repositories';

// Services
import { CommercialDecisionService }         from './services/commercial-decision.service';
import { DefaultPolicyResolver }             from './policy/default-policy-resolver';
import { DefaultEntitlementResolver }        from './policy/default-entitlement-resolver';

// Controllers
import { CommercialDecisionController }      from './controllers/commercial-decision.controller';

// Interfaces
import { POLICY_RESOLVER }                   from './interfaces/policy-resolver.interfaces';
import { ENTITLEMENT_RESOLVER }              from './interfaces/entitlement-resolver.interfaces';

// Guards
import { SuperAdminGuard }                   from '../admin/guards/super-admin.guard';

const ENTITIES = [
  CommercialRuleEntity,
  CommercialRuleVersionEntity,
  CommercialDecisionSnapshotEntity,
  PackageVersionEntity,                // package_versions — new versioning layer
  CommercialProductEntity,
  ModuleRegistryEntity,
  PricingModelEntity,
  PaymentOwnershipPolicyEntity,
  RevenueDistributionPolicyEntity,
  GatewayDefinitionEntity,
  GatewayCredentialEntity,
  FeatureFlagEntity,
  CommercialAuditEntity,
];

const REPOSITORIES = [
  CommercialRuleRepository,
  CommercialRuleVersionRepository,
  CommercialDecisionSnapshotRepository,
  PackageVersionRepository,
  CommercialProductRepository,
  ModuleRegistryRepository,
  PricingModelRepository,
  PaymentOwnershipPolicyRepository,
  RevenueDistributionPolicyRepository,
  GatewayDefinitionRepository,
  GatewayCredentialRepository,
  FeatureFlagRepository,
  CommercialAuditRepository,
];

/**
 * CommercialEngineModule
 *
 * Package resolution authority: PlanModule (imported).
 *   Tenant → PlanEntity → PackageEntity (existing system, no duplication)
 *   PackageVersionEntity adds immutable versioning on top of PackageEntity.
 *
 * PackageDefinitionEntity was removed in Batch 7.5A.1.4 (table collision
 * with the existing package module's PackageEntity / package_definitions table).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(ENTITIES),
    PlanModule,               // provides PlanService for tenant→package resolution
  ],
  controllers: [CommercialDecisionController],
  providers: [
    ...REPOSITORIES,
    { provide: ENTITLEMENT_RESOLVER, useClass: DefaultEntitlementResolver },
    { provide: POLICY_RESOLVER,      useClass: DefaultPolicyResolver },
    // String-token aliases for cross-module injection into DefaultPolicyResolver
    { provide: 'PlanService',    useExisting: 'PlanService' },
    { provide: 'PackageService', useExisting: 'PackageService' },
    CommercialDecisionService,
    SuperAdminGuard,
  ],
  exports: [...REPOSITORIES, CommercialDecisionService],
})
export class CommercialEngineModule {}

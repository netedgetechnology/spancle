import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { CommercialRuleEntity }              from './entities/commercial-rule.entity';
import { CommercialRuleVersionEntity }       from './entities/commercial-rule-version.entity';
import {
  CommercialDecisionSnapshotEntity,
  PackageDefinitionEntity,
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
  PackageDefinitionRepository,
  PackageVersionRepository,
  PaymentOwnershipPolicyRepository,
  PricingModelRepository,
  RevenueDistributionPolicyRepository,
}                                            from './commercial.repositories';

// Services
import { CommercialDecisionService }         from './services/commercial-decision.service';

// Controllers
import { CommercialDecisionController }      from './controllers/commercial-decision.controller';

// Guards
import { SuperAdminGuard }                   from '../admin/guards/super-admin.guard';

const ENTITIES = [
  CommercialRuleEntity,
  CommercialRuleVersionEntity,
  CommercialDecisionSnapshotEntity,
  PackageDefinitionEntity,
  PackageVersionEntity,
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
  PackageDefinitionRepository,
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
 * CommercialEngineModule — bounded context for commercial rules, pricing,
 * package definitions, payment ownership, revenue distribution, gateway
 * credentials, feature flags, and audit.
 *
 * This module has NO dependency on BookingModule or FinanceModule.
 * Cross-engine communication uses events only (EventEmitter2).
 */
@Module({
  imports: [TypeOrmModule.forFeature(ENTITIES)],
  controllers: [CommercialDecisionController],
  providers: [...REPOSITORIES, CommercialDecisionService, SuperAdminGuard],
  exports: [...REPOSITORIES, CommercialDecisionService],
})
export class CommercialEngineModule {}

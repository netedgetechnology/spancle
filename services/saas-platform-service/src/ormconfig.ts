/**
 * TypeORM DataSource — saas-platform-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CommercialRuleEntity }              from './modules/commercial/entities/commercial-rule.entity';
import { BannerEntity } from './modules/banner/entities/banner.entity';
import { CommercialRuleVersionEntity }       from './modules/commercial/entities/commercial-rule-version.entity';
import {
  CommercialDecisionSnapshotEntity,
  PackageVersionEntity,
}                                            from './modules/commercial/entities/commercial-snapshot-and-package.entity';
import {
  CommercialProductEntity,
  ModuleRegistryEntity,
  PricingModelEntity,
}                                            from './modules/commercial/entities/commercial-product-module-pricing.entity';
import {
  CommercialAuditEntity,
  FeatureFlagEntity,
  GatewayCredentialEntity,
  GatewayDefinitionEntity,
  PaymentOwnershipPolicyEntity,
  RevenueDistributionPolicyEntity,
}                                            from './modules/commercial/entities/commercial-policy-gateway-flag-audit.entity';
import { BlogCategoryEntity } from './modules/blog/entities/blog-category.entity';
import { BlogPostEntity } from './modules/blog/entities/blog-post.entity';
import { HomepageSectionEntity } from './modules/homepage/entities/homepage-section.entity';
import { MediaAssetEntity } from './modules/media/entities/media-asset.entity';
import { MenuItemEntity } from './modules/menu/entities/menu-item.entity';
import { MenuEntity } from './modules/menu/entities/menu.entity';
import { PackageEntity } from './modules/package/entities/package.entity';
import { PageEntity } from './modules/page/entities/page.entity';
import { PlanEntity } from './modules/plan/entities/plan.entity';
import { SubscriptionEntity } from './modules/subscription/entities/subscription.entity';
import { TenantEntity } from './modules/tenant/entities/tenant.entity';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    BannerEntity,
    BlogCategoryEntity,
    BlogPostEntity,
    HomepageSectionEntity,
    MediaAssetEntity,
    MenuItemEntity,
    MenuEntity,
    PackageEntity,
    PageEntity,
    PlanEntity,
    SubscriptionEntity,
    TenantEntity,
    CommercialRuleEntity,
    CommercialRuleVersionEntity,
    CommercialDecisionSnapshotEntity,
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
  ],
  migrations:         ['dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  synchronize:        false,
  logging:            ['error', 'migration'],
  ssl: process.env['DATABASE_SSL'] === 'true'
    ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
    : false,
});

export default dataSource;

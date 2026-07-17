"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const commercial_rule_entity_1 = require("./modules/commercial/entities/commercial-rule.entity");
const banner_entity_1 = require("./modules/banner/entities/banner.entity");
const commercial_rule_version_entity_1 = require("./modules/commercial/entities/commercial-rule-version.entity");
const commercial_snapshot_and_package_entity_1 = require("./modules/commercial/entities/commercial-snapshot-and-package.entity");
const commercial_product_module_pricing_entity_1 = require("./modules/commercial/entities/commercial-product-module-pricing.entity");
const commercial_policy_gateway_flag_audit_entity_1 = require("./modules/commercial/entities/commercial-policy-gateway-flag-audit.entity");
const blog_category_entity_1 = require("./modules/blog/entities/blog-category.entity");
const blog_post_entity_1 = require("./modules/blog/entities/blog-post.entity");
const homepage_section_entity_1 = require("./modules/homepage/entities/homepage-section.entity");
const media_asset_entity_1 = require("./modules/media/entities/media-asset.entity");
const menu_item_entity_1 = require("./modules/menu/entities/menu-item.entity");
const menu_entity_1 = require("./modules/menu/entities/menu.entity");
const package_entity_1 = require("./modules/package/entities/package.entity");
const page_entity_1 = require("./modules/page/entities/page.entity");
const plan_entity_1 = require("./modules/plan/entities/plan.entity");
const subscription_entity_1 = require("./modules/subscription/entities/subscription.entity");
const tenant_entity_1 = require("./modules/tenant/entities/tenant.entity");
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env['DATABASE_URL'],
    entities: [
        banner_entity_1.BannerEntity,
        blog_category_entity_1.BlogCategoryEntity,
        blog_post_entity_1.BlogPostEntity,
        homepage_section_entity_1.HomepageSectionEntity,
        media_asset_entity_1.MediaAssetEntity,
        menu_item_entity_1.MenuItemEntity,
        menu_entity_1.MenuEntity,
        package_entity_1.PackageEntity,
        page_entity_1.PageEntity,
        plan_entity_1.PlanEntity,
        subscription_entity_1.SubscriptionEntity,
        tenant_entity_1.TenantEntity,
        commercial_rule_entity_1.CommercialRuleEntity,
        commercial_rule_version_entity_1.CommercialRuleVersionEntity,
        commercial_snapshot_and_package_entity_1.CommercialDecisionSnapshotEntity,
        commercial_snapshot_and_package_entity_1.PackageDefinitionEntity,
        commercial_snapshot_and_package_entity_1.PackageVersionEntity,
        commercial_product_module_pricing_entity_1.CommercialProductEntity,
        commercial_product_module_pricing_entity_1.ModuleRegistryEntity,
        commercial_product_module_pricing_entity_1.PricingModelEntity,
        commercial_policy_gateway_flag_audit_entity_1.PaymentOwnershipPolicyEntity,
        commercial_policy_gateway_flag_audit_entity_1.RevenueDistributionPolicyEntity,
        commercial_policy_gateway_flag_audit_entity_1.GatewayDefinitionEntity,
        commercial_policy_gateway_flag_audit_entity_1.GatewayCredentialEntity,
        commercial_policy_gateway_flag_audit_entity_1.FeatureFlagEntity,
        commercial_policy_gateway_flag_audit_entity_1.CommercialAuditEntity,
    ],
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: ['error', 'migration'],
    ssl: process.env['DATABASE_SSL'] === 'true'
        ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
        : false,
});
exports.default = dataSource;
//# sourceMappingURL=ormconfig.js.map
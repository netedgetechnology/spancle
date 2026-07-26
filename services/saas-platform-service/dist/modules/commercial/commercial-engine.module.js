"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialEngineModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const plan_module_1 = require("../plan/plan.module");
const package_module_1 = require("../package/package.module");
const platform_module_1 = require("../../platform/platform.module");
const commercial_rule_entity_1 = require("./entities/commercial-rule.entity");
const commercial_rule_version_entity_1 = require("./entities/commercial-rule-version.entity");
const commercial_snapshot_and_package_entity_1 = require("./entities/commercial-snapshot-and-package.entity");
const commercial_product_module_pricing_entity_1 = require("./entities/commercial-product-module-pricing.entity");
const commercial_policy_gateway_flag_audit_entity_1 = require("./entities/commercial-policy-gateway-flag-audit.entity");
const commercial_repositories_1 = require("./commercial.repositories");
const commercial_decision_service_1 = require("./services/commercial-decision.service");
const default_policy_resolver_1 = require("./policy/default-policy-resolver");
const default_entitlement_resolver_1 = require("./policy/default-entitlement-resolver");
const default_rule_resolver_1 = require("./policy/default-rule-resolver");
const default_gateway_registry_1 = require("./policy/default-gateway-registry");
const commercial_decision_controller_1 = require("./controllers/commercial-decision.controller");
const policy_resolver_interfaces_1 = require("./interfaces/policy-resolver.interfaces");
const entitlement_resolver_interfaces_1 = require("./interfaces/entitlement-resolver.interfaces");
const rule_resolver_interfaces_1 = require("./interfaces/rule-resolver.interfaces");
const gateway_registry_interfaces_1 = require("./interfaces/gateway-registry.interfaces");
const super_admin_guard_1 = require("../admin/guards/super-admin.guard");
const plan_service_1 = require("../plan/services/plan.service");
const package_service_1 = require("../package/services/package.service");
const ENTITIES = [
    commercial_rule_entity_1.CommercialRuleEntity,
    commercial_rule_version_entity_1.CommercialRuleVersionEntity,
    commercial_snapshot_and_package_entity_1.CommercialDecisionSnapshotEntity,
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
];
const REPOSITORIES = [
    commercial_repositories_1.CommercialRuleRepository,
    commercial_repositories_1.CommercialRuleVersionRepository,
    commercial_repositories_1.CommercialDecisionSnapshotRepository,
    commercial_repositories_1.PackageVersionRepository,
    commercial_repositories_1.CommercialProductRepository,
    commercial_repositories_1.ModuleRegistryRepository,
    commercial_repositories_1.PricingModelRepository,
    commercial_repositories_1.PaymentOwnershipPolicyRepository,
    commercial_repositories_1.RevenueDistributionPolicyRepository,
    commercial_repositories_1.GatewayDefinitionRepository,
    commercial_repositories_1.GatewayCredentialRepository,
    commercial_repositories_1.FeatureFlagRepository,
    commercial_repositories_1.CommercialAuditRepository,
];
let CommercialEngineModule = class CommercialEngineModule {
};
exports.CommercialEngineModule = CommercialEngineModule;
exports.CommercialEngineModule = CommercialEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature(ENTITIES),
            plan_module_1.PlanModule,
            package_module_1.PackageModule,
            platform_module_1.PlatformModule,
        ],
        controllers: [commercial_decision_controller_1.CommercialDecisionController],
        providers: [
            ...REPOSITORIES,
            { provide: gateway_registry_interfaces_1.GATEWAY_REGISTRY, useClass: default_gateway_registry_1.DefaultGatewayRegistry },
            { provide: rule_resolver_interfaces_1.RULE_RESOLVER, useClass: default_rule_resolver_1.DefaultRuleResolver },
            { provide: entitlement_resolver_interfaces_1.ENTITLEMENT_RESOLVER, useClass: default_entitlement_resolver_1.DefaultEntitlementResolver },
            { provide: policy_resolver_interfaces_1.POLICY_RESOLVER, useClass: default_policy_resolver_1.DefaultPolicyResolver },
            { provide: 'PlanService', useExisting: plan_service_1.PlanService },
            { provide: 'PackageService', useExisting: package_service_1.PackageService },
            commercial_decision_service_1.CommercialDecisionService,
            super_admin_guard_1.SuperAdminGuard,
        ],
        exports: [...REPOSITORIES, commercial_decision_service_1.CommercialDecisionService],
    })
], CommercialEngineModule);
//# sourceMappingURL=commercial-engine.module.js.map
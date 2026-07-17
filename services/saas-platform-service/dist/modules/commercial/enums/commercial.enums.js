"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialAuditAction = exports.FeatureFlagStatus = exports.CommercialDecisionOutcome = exports.CommercialProductType = exports.GatewayScope = exports.GatewayType = exports.RevenueDistributionType = exports.PaymentOwnershipType = exports.PricingModelType = exports.CommercialRuleStatus = exports.CommercialRuleType = void 0;
var CommercialRuleType;
(function (CommercialRuleType) {
    CommercialRuleType["PRICING"] = "PRICING";
    CommercialRuleType["DISCOUNT"] = "DISCOUNT";
    CommercialRuleType["ELIGIBILITY"] = "ELIGIBILITY";
    CommercialRuleType["RESTRICTION"] = "RESTRICTION";
    CommercialRuleType["DISTRIBUTION"] = "DISTRIBUTION";
})(CommercialRuleType || (exports.CommercialRuleType = CommercialRuleType = {}));
var CommercialRuleStatus;
(function (CommercialRuleStatus) {
    CommercialRuleStatus["DRAFT"] = "DRAFT";
    CommercialRuleStatus["ACTIVE"] = "ACTIVE";
    CommercialRuleStatus["SUSPENDED"] = "SUSPENDED";
    CommercialRuleStatus["ARCHIVED"] = "ARCHIVED";
})(CommercialRuleStatus || (exports.CommercialRuleStatus = CommercialRuleStatus = {}));
var PricingModelType;
(function (PricingModelType) {
    PricingModelType["FLAT_RATE"] = "FLAT_RATE";
    PricingModelType["PER_UNIT"] = "PER_UNIT";
    PricingModelType["TIERED"] = "TIERED";
    PricingModelType["VOLUME"] = "VOLUME";
    PricingModelType["GRADUATED"] = "GRADUATED";
    PricingModelType["PACKAGE"] = "PACKAGE";
    PricingModelType["CUSTOM"] = "CUSTOM";
})(PricingModelType || (exports.PricingModelType = PricingModelType = {}));
var PaymentOwnershipType;
(function (PaymentOwnershipType) {
    PaymentOwnershipType["PLATFORM"] = "PLATFORM";
    PaymentOwnershipType["TENANT"] = "TENANT";
    PaymentOwnershipType["SPLIT"] = "SPLIT";
})(PaymentOwnershipType || (exports.PaymentOwnershipType = PaymentOwnershipType = {}));
var RevenueDistributionType;
(function (RevenueDistributionType) {
    RevenueDistributionType["FLAT_PERCENTAGE"] = "FLAT_PERCENTAGE";
    RevenueDistributionType["TIERED"] = "TIERED";
    RevenueDistributionType["FIXED_AMOUNT"] = "FIXED_AMOUNT";
    RevenueDistributionType["NET_REVENUE"] = "NET_REVENUE";
})(RevenueDistributionType || (exports.RevenueDistributionType = RevenueDistributionType = {}));
var GatewayType;
(function (GatewayType) {
    GatewayType["STRIPE"] = "STRIPE";
    GatewayType["RAZORPAY"] = "RAZORPAY";
    GatewayType["PAYU"] = "PAYU";
    GatewayType["CASHFREE"] = "CASHFREE";
    GatewayType["MANUAL"] = "MANUAL";
    GatewayType["CUSTOM"] = "CUSTOM";
})(GatewayType || (exports.GatewayType = GatewayType = {}));
var GatewayScope;
(function (GatewayScope) {
    GatewayScope["PLATFORM"] = "PLATFORM";
    GatewayScope["TENANT"] = "TENANT";
})(GatewayScope || (exports.GatewayScope = GatewayScope = {}));
var CommercialProductType;
(function (CommercialProductType) {
    CommercialProductType["SUBSCRIPTION"] = "SUBSCRIPTION";
    CommercialProductType["ONE_TIME"] = "ONE_TIME";
    CommercialProductType["USAGE_BASED"] = "USAGE_BASED";
    CommercialProductType["ADDON"] = "ADDON";
})(CommercialProductType || (exports.CommercialProductType = CommercialProductType = {}));
var CommercialDecisionOutcome;
(function (CommercialDecisionOutcome) {
    CommercialDecisionOutcome["ALLOWED"] = "ALLOWED";
    CommercialDecisionOutcome["DENIED"] = "DENIED";
    CommercialDecisionOutcome["MODIFIED"] = "MODIFIED";
    CommercialDecisionOutcome["PENDING"] = "PENDING";
})(CommercialDecisionOutcome || (exports.CommercialDecisionOutcome = CommercialDecisionOutcome = {}));
var FeatureFlagStatus;
(function (FeatureFlagStatus) {
    FeatureFlagStatus["ENABLED"] = "ENABLED";
    FeatureFlagStatus["DISABLED"] = "DISABLED";
    FeatureFlagStatus["GRADUAL"] = "GRADUAL";
})(FeatureFlagStatus || (exports.FeatureFlagStatus = FeatureFlagStatus = {}));
var CommercialAuditAction;
(function (CommercialAuditAction) {
    CommercialAuditAction["RULE_CREATED"] = "RULE_CREATED";
    CommercialAuditAction["RULE_UPDATED"] = "RULE_UPDATED";
    CommercialAuditAction["RULE_ARCHIVED"] = "RULE_ARCHIVED";
    CommercialAuditAction["VERSION_CREATED"] = "VERSION_CREATED";
    CommercialAuditAction["DECISION_MADE"] = "DECISION_MADE";
    CommercialAuditAction["FLAG_TOGGLED"] = "FLAG_TOGGLED";
    CommercialAuditAction["CREDENTIAL_SET"] = "CREDENTIAL_SET";
})(CommercialAuditAction || (exports.CommercialAuditAction = CommercialAuditAction = {}));
//# sourceMappingURL=commercial.enums.js.map
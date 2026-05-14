"use strict";
/**
 * Tenant domain event constants and payload interfaces.
 * Aligns with EventRegistry in @spancle/event-contracts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantEventNames = void 0;
var TenantEventNames;
(function (TenantEventNames) {
    TenantEventNames["CREATED"] = "spancle.tenant.created";
    TenantEventNames["UPDATED"] = "spancle.tenant.updated";
    TenantEventNames["ACTIVATED"] = "spancle.tenant.activated";
    TenantEventNames["SUSPENDED"] = "spancle.tenant.suspended";
    TenantEventNames["TERMINATED"] = "spancle.tenant.terminated";
    TenantEventNames["TIER_CHANGED"] = "spancle.tenant.tier_changed";
})(TenantEventNames || (exports.TenantEventNames = TenantEventNames = {}));
//# sourceMappingURL=tenant.events.js.map
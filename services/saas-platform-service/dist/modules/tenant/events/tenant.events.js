"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantEvents = void 0;
/**
 * TenantEvents — domain event constants for the tenant domain.
 * All events namespaced under spancle.tenant.*
 */
var TenantEvents;
(function (TenantEvents) {
    TenantEvents["CREATED"] = "spancle.tenant.created";
    TenantEvents["UPDATED"] = "spancle.tenant.updated";
    TenantEvents["DELETED"] = "spancle.tenant.deleted";
    TenantEvents["STATUS_CHANGED"] = "spancle.tenant.status_changed";
})(TenantEvents || (exports.TenantEvents = TenantEvents = {}));
//# sourceMappingURL=tenant.events.js.map
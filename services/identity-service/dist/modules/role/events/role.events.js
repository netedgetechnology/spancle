"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleEvents = void 0;
/**
 * RoleEvents — domain event constants for the role domain.
 * All events namespaced under spancle.role.*
 */
var RoleEvents;
(function (RoleEvents) {
    RoleEvents["CREATED"] = "spancle.role.created";
    RoleEvents["UPDATED"] = "spancle.role.updated";
    RoleEvents["DELETED"] = "spancle.role.deleted";
    RoleEvents["STATUS_CHANGED"] = "spancle.role.status_changed";
})(RoleEvents || (exports.RoleEvents = RoleEvents = {}));
//# sourceMappingURL=role.events.js.map
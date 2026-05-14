"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserEvents = void 0;
/**
 * UserEvents — domain event constants for the user domain.
 * All events namespaced under spancle.user.*
 */
var UserEvents;
(function (UserEvents) {
    UserEvents["CREATED"] = "spancle.user.created";
    UserEvents["UPDATED"] = "spancle.user.updated";
    UserEvents["DELETED"] = "spancle.user.deleted";
    UserEvents["STATUS_CHANGED"] = "spancle.user.status_changed";
})(UserEvents || (exports.UserEvents = UserEvents = {}));
//# sourceMappingURL=user.events.js.map
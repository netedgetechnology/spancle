"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityEvents = void 0;
var IdentityEvents;
(function (IdentityEvents) {
    IdentityEvents["LOGIN_SUCCESS"] = "spancle.identity.login_success";
    IdentityEvents["LOGIN_FAILED"] = "spancle.identity.login_failed";
    IdentityEvents["LOGOUT"] = "spancle.identity.logout";
    IdentityEvents["PASSWORD_CHANGED"] = "spancle.identity.password_changed";
    IdentityEvents["PASSWORD_RESET"] = "spancle.identity.password_reset";
    IdentityEvents["ACCOUNT_LOCKED"] = "spancle.identity.account_locked";
    IdentityEvents["ACCOUNT_UNLOCKED"] = "spancle.identity.account_unlocked";
    IdentityEvents["EMAIL_VERIFIED"] = "spancle.identity.email_verified";
    IdentityEvents["IDENTITY_CREATED"] = "spancle.identity.created";
    IdentityEvents["IDENTITY_DEACTIVATED"] = "spancle.identity.deactivated";
})(IdentityEvents || (exports.IdentityEvents = IdentityEvents = {}));
//# sourceMappingURL=identity.events.js.map
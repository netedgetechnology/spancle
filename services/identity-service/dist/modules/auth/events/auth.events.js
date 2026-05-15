"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEventNames = void 0;
var AuthEventNames;
(function (AuthEventNames) {
    AuthEventNames["LOGIN_SUCCESS"] = "spancle.identity.login_success";
    AuthEventNames["LOGIN_FAILED"] = "spancle.identity.login_failed";
    AuthEventNames["LOGOUT"] = "spancle.identity.logout";
    AuthEventNames["TOKEN_REFRESHED"] = "spancle.identity.token_refreshed";
    AuthEventNames["TOKEN_REVOKED"] = "spancle.identity.token_revoked";
    AuthEventNames["PASSWORD_CHANGED"] = "spancle.identity.password_changed";
    AuthEventNames["PASSWORD_RESET_REQ"] = "spancle.identity.password_reset_requested";
    AuthEventNames["PASSWORD_RESET"] = "spancle.identity.password_reset";
    AuthEventNames["ACCOUNT_LOCKED"] = "spancle.identity.account_locked";
    AuthEventNames["ACCOUNT_UNLOCKED"] = "spancle.identity.account_unlocked";
    AuthEventNames["SESSIONS_REVOKED"] = "spancle.identity.sessions_revoked";
})(AuthEventNames || (exports.AuthEventNames = AuthEventNames = {}));
//# sourceMappingURL=auth.events.js.map
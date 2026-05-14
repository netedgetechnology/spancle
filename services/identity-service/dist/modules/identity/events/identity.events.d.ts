/**
 * IdentityEvents — all domain events emitted by the identity module.
 *
 * Channel convention: spancle.identity.<event>
 * All consumers must be tenant-aware and validate tenantId on receipt.
 */
export declare enum IdentityEvents {
    LOGIN_SUCCESS = "spancle.identity.login_success",
    LOGIN_FAILED = "spancle.identity.login_failed",
    LOGOUT = "spancle.identity.logout",
    PASSWORD_CHANGED = "spancle.identity.password_changed",
    PASSWORD_RESET = "spancle.identity.password_reset",
    ACCOUNT_LOCKED = "spancle.identity.account_locked",
    ACCOUNT_UNLOCKED = "spancle.identity.account_unlocked",
    EMAIL_VERIFIED = "spancle.identity.email_verified",
    IDENTITY_CREATED = "spancle.identity.created",
    IDENTITY_DEACTIVATED = "spancle.identity.deactivated"
}
export interface IdentityEventPayload {
    tenantId: string;
    identityId: string;
    userId?: string;
    timestamp: string;
}
export interface LoginSuccessPayload extends IdentityEventPayload {
    ipAddress?: string;
    userAgent?: string;
}
export interface LoginFailedPayload extends IdentityEventPayload {
    reason: string;
    attemptCount: number;
}
export interface PasswordChangedPayload extends IdentityEventPayload {
    changedBy: string;
}
export interface AccountLockedPayload extends IdentityEventPayload {
    lockedUntil: string;
    reason: string;
}
//# sourceMappingURL=identity.events.d.ts.map
/**
 * Auth domain events — emitted by AuthService on every state transition.
 *
 * All events MUST be wrapped in EventEnvelope before Redis publication.
 * Consumers: audit-service (Sprint 2), notification-service, reporting-service.
 */
export declare enum AuthEventNames {
    LOGIN_SUCCESS = "spancle.identity.login_success",
    LOGIN_FAILED = "spancle.identity.login_failed",
    LOGOUT = "spancle.identity.logout",
    TOKEN_REFRESHED = "spancle.identity.token_refreshed",
    TOKEN_REVOKED = "spancle.identity.token_revoked",
    PASSWORD_CHANGED = "spancle.identity.password_changed",
    PASSWORD_RESET_REQ = "spancle.identity.password_reset_requested",
    PASSWORD_RESET = "spancle.identity.password_reset",
    ACCOUNT_LOCKED = "spancle.identity.account_locked",
    ACCOUNT_UNLOCKED = "spancle.identity.account_unlocked",
    SESSIONS_REVOKED = "spancle.identity.sessions_revoked"
}
export interface BaseAuthEventPayload {
    tenantId: string;
    identityId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}
export interface LoginSuccessPayload extends BaseAuthEventPayload {
    role: string;
    sessionId: string;
}
export interface LoginFailedPayload {
    tenantId: string;
    email: string;
    reason: 'invalid_credentials' | 'account_locked' | 'account_inactive' | 'email_not_verified';
    attemptCount: number;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}
export interface LogoutPayload extends BaseAuthEventPayload {
    sessionId: string;
}
export interface TokenRefreshedPayload extends BaseAuthEventPayload {
    family: string;
}
export interface TokenRevokedPayload extends BaseAuthEventPayload {
    jti: string;
    reason: 'logout' | 'security' | 'password_change' | 'admin';
}
export interface PasswordChangedPayload extends BaseAuthEventPayload {
    changedBy: string;
    triggeredBy: 'user' | 'admin' | 'reset_flow';
}
export interface PasswordResetRequestedPayload {
    tenantId: string;
    email: string;
    timestamp: string;
    ipAddress?: string;
}
export interface AccountLockedPayload extends BaseAuthEventPayload {
    lockedUntil: string;
    reason: string;
    attemptCount: number;
}
export interface SessionsRevokedPayload extends BaseAuthEventPayload {
    revokedCount: number;
    reason: string;
}
//# sourceMappingURL=auth.events.d.ts.map
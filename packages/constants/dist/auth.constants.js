"use strict";
/**
 * Auth Constants
 * JWT, session, and token configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_TYPES = exports.MFA = exports.PASSWORD = exports.SESSION = exports.JWT = void 0;
exports.JWT = {
    ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60, // 15 minutes
    REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days
    ISSUER: 'spancle-sports-os',
    ALGORITHM: 'HS256',
};
exports.SESSION = {
    COOKIE_NAME: 'spancle.session',
    COOKIE_MAX_AGE_SECONDS: 7 * 24 * 60 * 60,
    SECURE: true,
    HTTP_ONLY: true,
    SAME_SITE: 'lax',
};
exports.PASSWORD = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    BCRYPT_ROUNDS: 12,
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
};
exports.MFA = {
    TOTP_ISSUER: 'Spancle Sports OS',
    TOTP_DIGITS: 6,
    TOTP_PERIOD_SECONDS: 30,
    BACKUP_CODE_COUNT: 10,
};
exports.TOKEN_TYPES = {
    ACCESS: 'access',
    REFRESH: 'refresh',
    EMAIL_VERIFY: 'email_verify',
    PASSWORD_RESET: 'password_reset',
    INVITE: 'invite',
    API_KEY: 'api_key',
};
//# sourceMappingURL=auth.constants.js.map
/**
 * Auth Constants
 * JWT, session, and token configuration.
 */
export declare const JWT: {
    readonly ACCESS_TOKEN_EXPIRY_SECONDS: number;
    readonly REFRESH_TOKEN_EXPIRY_SECONDS: number;
    readonly ISSUER: "spancle-sports-os";
    readonly ALGORITHM: "HS256";
};
export declare const SESSION: {
    readonly COOKIE_NAME: "spancle.session";
    readonly COOKIE_MAX_AGE_SECONDS: number;
    readonly SECURE: true;
    readonly HTTP_ONLY: true;
    readonly SAME_SITE: "lax";
};
export declare const PASSWORD: {
    readonly MIN_LENGTH: 8;
    readonly MAX_LENGTH: 128;
    readonly BCRYPT_ROUNDS: 12;
    readonly MAX_FAILED_ATTEMPTS: 5;
    readonly LOCKOUT_DURATION_MINUTES: 30;
};
export declare const MFA: {
    readonly TOTP_ISSUER: "Spancle Sports OS";
    readonly TOTP_DIGITS: 6;
    readonly TOTP_PERIOD_SECONDS: 30;
    readonly BACKUP_CODE_COUNT: 10;
};
export declare const TOKEN_TYPES: {
    readonly ACCESS: "access";
    readonly REFRESH: "refresh";
    readonly EMAIL_VERIFY: "email_verify";
    readonly PASSWORD_RESET: "password_reset";
    readonly INVITE: "invite";
    readonly API_KEY: "api_key";
};
export type TokenType = typeof TOKEN_TYPES[keyof typeof TOKEN_TYPES];
//# sourceMappingURL=auth.constants.d.ts.map
/**
 * SignupDto — initiates the onboarding flow.
 * Creates a pending registration record and sends a verification email.
 */
export declare class SignupDto {
    /** Full name of the person signing up */
    fullName: string;
    /** Organisation / club name — becomes the tenant name */
    orgName: string;
    /**
     * Desired subdomain slug — e.g. "acme-fc" → acme-fc.app.spancle.io
     * Immutable after tenant creation. Validated for uniqueness.
     */
    slug: string;
    email: string;
}
/**
 * VerifyEmailDto — submits the verification token received by email.
 */
export declare class VerifyEmailDto {
    /** The registrationId returned from signup — ties the token to a session */
    registrationId: string;
    /**
     * Cryptographically random 64-char hex token sent in the verification email.
     * Stored in Redis with 24h TTL, deleted on first valid use.
     */
    token: string;
}
export declare class ResendVerificationDto {
    registrationId: string;
}
/**
 * SelectPackageDto — tenant chooses a plan for their trial.
 * If packageId is omitted, the 'free' tier package is selected by default.
 */
export declare class SelectPackageDto {
    registrationId: string;
    packageId: string;
    billingCycle?: 'monthly' | 'annual';
}
/**
 * CompleteOnboardingDto — final setup step.
 * Sets the admin password and any org-level settings before provisioning.
 */
export declare class CompleteOnboardingDto {
    registrationId: string;
    /**
     * Admin password — must satisfy PasswordService.enforcePolicy().
     * Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.
     */
    password: string;
    confirmPassword: string;
    /** Timezone — e.g. 'Europe/London' */
    timezone?: string;
    /** ISO-4217 currency — e.g. 'GBP' */
    currency?: string;
}
export declare class CheckSlugDto {
    slug: string;
}
//# sourceMappingURL=onboarding.dto.d.ts.map
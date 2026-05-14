import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BaseConfig } from '../../../infrastructure/config/base.config';
/**
 * Registration state stored in Redis.
 * Persists across all onboarding steps — acts as the in-progress workflow record.
 */
export interface RegistrationRecord {
    /** Stable ID for this signup attempt */
    registrationId: string;
    /** Step the user has reached: 1=signup, 2=verified, 3=package_selected, 4=provisioned */
    step: 1 | 2 | 3 | 4;
    fullName: string;
    orgName: string;
    slug: string;
    email: string;
    emailVerified: boolean;
    /** Selected packageId (set in step 3) */
    packageId: string | null;
    billingCycle: 'monthly' | 'annual';
    /** Set after provisioning */
    tenantId: string | null;
    subscriptionId: string | null;
    createdAt: string;
    lastUpdatedAt: string;
}
/**
 * OnboardingTokenService — manages onboarding workflow state in Redis.
 *
 * Key namespaces (all on Redis DB 0 — cache):
 *   onboarding:reg:{registrationId}    → RegistrationRecord JSON, TTL 48h
 *   onboarding:token:{registrationId}  → verification token hex, TTL 24h
 *   onboarding:slug:{slug}             → "reserved" string, TTL 48h (prevents races)
 *   onboarding:email:{email}           → registrationId, TTL 48h (prevents duplicate signups)
 *   onboarding:idempotency:{key}       → response JSON, TTL 60s (prevents double-submit)
 */
export declare class OnboardingTokenService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private redis;
    private readonly REG_TTL_S;
    private readonly TOKEN_TTL_S;
    private readonly IDEM_TTL_S;
    constructor(config: ConfigService<BaseConfig, true>);
    onModuleInit(): void;
    createRegistration(data: Omit<RegistrationRecord, 'registrationId' | 'step' | 'createdAt' | 'lastUpdatedAt' | 'emailVerified' | 'packageId' | 'tenantId' | 'subscriptionId' | 'billingCycle'>): Promise<RegistrationRecord>;
    getRegistration(registrationId: string): Promise<RegistrationRecord | null>;
    updateRegistration(registrationId: string, patch: Partial<RegistrationRecord>): Promise<RegistrationRecord>;
    deleteRegistration(registrationId: string): Promise<void>;
    /**
     * Generates a new 64-character hex verification token.
     * Old token is overwritten — only one valid token per registration at a time.
     */
    generateVerificationToken(registrationId: string): Promise<string>;
    /**
     * Validates a verification token — single-use, deleted immediately on match.
     */
    validateAndConsumeToken(registrationId: string, token: string): Promise<boolean>;
    isSlugReserved(slug: string): Promise<boolean>;
    isEmailPendingRegistration(email: string): Promise<string | null>;
    getIdempotentResponse(key: string): Promise<string | null>;
    setIdempotentResponse(key: string, response: unknown): Promise<void>;
    private regKey;
    private tokenKey;
    private slugKey;
    private emailKey;
}
//# sourceMappingURL=onboarding-token.service.d.ts.map
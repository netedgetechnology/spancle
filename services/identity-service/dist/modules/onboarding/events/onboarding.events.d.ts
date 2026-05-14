/**
 * onboarding.events.ts — Domain events emitted at each onboarding step.
 *
 * These events are consumed by:
 *   - communication-service: sends verification email, welcome email
 *   - reporting-service: tracks funnel conversion
 *   - saas-platform-service: triggers subscription provisioning listener
 */
export declare enum OnboardingEventNames {
    SIGNUP_INITIATED = "spancle.onboarding.signup.initiated",
    EMAIL_VERIFICATION_SENT = "spancle.onboarding.email.verification_sent",
    EMAIL_VERIFIED = "spancle.onboarding.email.verified",
    PACKAGE_SELECTED = "spancle.onboarding.package.selected",
    TENANT_PROVISIONED = "spancle.onboarding.tenant.provisioned",
    ADMIN_CREATED = "spancle.onboarding.admin.created",
    ONBOARDING_COMPLETED = "spancle.onboarding.completed",
    ONBOARDING_FAILED = "spancle.onboarding.failed"
}
export interface OnboardingBasePayload {
    registrationId: string;
    email: string;
    timestamp: string;
}
export interface SignupInitiatedPayload extends OnboardingBasePayload {
    orgName: string;
    slug: string;
}
export interface EmailVerificationSentPayload extends OnboardingBasePayload {
    /** Masked email for logging — never the raw token */
    maskedEmail: string;
    expiresAt: string;
}
export interface EmailVerifiedPayload extends OnboardingBasePayload {
    verifiedAt: string;
}
export interface PackageSelectedPayload extends OnboardingBasePayload {
    packageId: string;
    tierKey: string;
    billingCycle: string;
}
export interface TenantProvisionedPayload extends OnboardingBasePayload {
    tenantId: string;
    subscriptionId: string;
    tierKey: string;
}
export interface AdminCreatedPayload extends OnboardingBasePayload {
    tenantId: string;
    userId: string;
    identityId: string;
}
export interface OnboardingCompletedPayload extends OnboardingBasePayload {
    tenantId: string;
    userId: string;
    subscriptionId: string;
    durationMs: number;
}
export interface OnboardingFailedPayload extends OnboardingBasePayload {
    step: string;
    reason: string;
}
//# sourceMappingURL=onboarding.events.d.ts.map
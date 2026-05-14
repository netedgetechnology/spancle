"use strict";
/**
 * onboarding.events.ts — Domain events emitted at each onboarding step.
 *
 * These events are consumed by:
 *   - communication-service: sends verification email, welcome email
 *   - reporting-service: tracks funnel conversion
 *   - saas-platform-service: triggers subscription provisioning listener
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingEventNames = void 0;
var OnboardingEventNames;
(function (OnboardingEventNames) {
    OnboardingEventNames["SIGNUP_INITIATED"] = "spancle.onboarding.signup.initiated";
    OnboardingEventNames["EMAIL_VERIFICATION_SENT"] = "spancle.onboarding.email.verification_sent";
    OnboardingEventNames["EMAIL_VERIFIED"] = "spancle.onboarding.email.verified";
    OnboardingEventNames["PACKAGE_SELECTED"] = "spancle.onboarding.package.selected";
    OnboardingEventNames["TENANT_PROVISIONED"] = "spancle.onboarding.tenant.provisioned";
    OnboardingEventNames["ADMIN_CREATED"] = "spancle.onboarding.admin.created";
    OnboardingEventNames["ONBOARDING_COMPLETED"] = "spancle.onboarding.completed";
    OnboardingEventNames["ONBOARDING_FAILED"] = "spancle.onboarding.failed";
})(OnboardingEventNames || (exports.OnboardingEventNames = OnboardingEventNames = {}));
//# sourceMappingURL=onboarding.events.js.map
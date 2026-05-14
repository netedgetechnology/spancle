"use strict";
/**
 * plan-limits.types.ts
 *
 * Type contracts for tier-based plan restrictions.
 * Consumed by PlanLimitGuard, PlanRestrictionMiddleware, and TenantContextRuntime.
 *
 * -1 = unlimited (Enterprise tier)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PLAN_LIMITS = void 0;
/** Per-tier default limits — authoritative source for enforcement */
exports.DEFAULT_PLAN_LIMITS = {
    free: {
        tier: 'free',
        resources: {
            maxUsers: 5,
            maxStorageGb: 1,
            maxApiCallsPerDay: 1_000,
            maxConcurrentBookings: 10,
            maxActiveTournaments: 1,
            maxAcademies: 1,
            maxPlayersPerAcademy: 25,
            maxNotificationsPerDay: 50,
            maxReportsPerDay: 2,
        },
        features: {
            customBranding: false,
            advancedAnalytics: false,
            apiAccess: false,
            webhooks: false,
            multiAcademy: false,
            prioritySupport: false,
            auditLogAccess: false,
            customRoles: false,
            dataExport: false,
            ssoIntegration: false,
        },
    },
    starter: {
        tier: 'starter',
        resources: {
            maxUsers: 25,
            maxStorageGb: 10,
            maxApiCallsPerDay: 10_000,
            maxConcurrentBookings: 50,
            maxActiveTournaments: 3,
            maxAcademies: 1,
            maxPlayersPerAcademy: 100,
            maxNotificationsPerDay: 500,
            maxReportsPerDay: 10,
        },
        features: {
            customBranding: false,
            advancedAnalytics: false,
            apiAccess: true,
            webhooks: false,
            multiAcademy: false,
            prioritySupport: false,
            auditLogAccess: false,
            customRoles: false,
            dataExport: true,
            ssoIntegration: false,
        },
    },
    growth: {
        tier: 'growth',
        resources: {
            maxUsers: 100,
            maxStorageGb: 50,
            maxApiCallsPerDay: 50_000,
            maxConcurrentBookings: 200,
            maxActiveTournaments: 10,
            maxAcademies: 3,
            maxPlayersPerAcademy: 250,
            maxNotificationsPerDay: 2_000,
            maxReportsPerDay: 25,
        },
        features: {
            customBranding: true,
            advancedAnalytics: false,
            apiAccess: true,
            webhooks: true,
            multiAcademy: true,
            prioritySupport: false,
            auditLogAccess: true,
            customRoles: false,
            dataExport: true,
            ssoIntegration: false,
        },
    },
    pro: {
        tier: 'pro',
        resources: {
            maxUsers: 500,
            maxStorageGb: 200,
            maxApiCallsPerDay: 200_000,
            maxConcurrentBookings: 1_000,
            maxActiveTournaments: 25,
            maxAcademies: 10,
            maxPlayersPerAcademy: 500,
            maxNotificationsPerDay: 10_000,
            maxReportsPerDay: 100,
        },
        features: {
            customBranding: true,
            advancedAnalytics: true,
            apiAccess: true,
            webhooks: true,
            multiAcademy: true,
            prioritySupport: true,
            auditLogAccess: true,
            customRoles: true,
            dataExport: true,
            ssoIntegration: false,
        },
    },
    enterprise: {
        tier: 'enterprise',
        resources: {
            maxUsers: -1,
            maxStorageGb: -1,
            maxApiCallsPerDay: -1,
            maxConcurrentBookings: -1,
            maxActiveTournaments: -1,
            maxAcademies: -1,
            maxPlayersPerAcademy: -1,
            maxNotificationsPerDay: -1,
            maxReportsPerDay: -1,
        },
        features: {
            customBranding: true,
            advancedAnalytics: true,
            apiAccess: true,
            webhooks: true,
            multiAcademy: true,
            prioritySupport: true,
            auditLogAccess: true,
            customRoles: true,
            dataExport: true,
            ssoIntegration: true,
        },
    },
};
//# sourceMappingURL=plan-limits.types.js.map
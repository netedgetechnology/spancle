import { z } from 'zod';
export declare const TenantCreatedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    actorId: z.ZodOptional<z.ZodString>;
} & {
    name: z.ZodString;
    slug: z.ZodString;
    tier: z.ZodString;
    ownerEmail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    tenantId: string;
    slug: string;
    tier: string;
    ownerEmail: string;
    actorId?: string | undefined;
}, {
    name: string;
    tenantId: string;
    slug: string;
    tier: string;
    ownerEmail: string;
    actorId?: string | undefined;
}>;
export declare const TenantStatusChangedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    actorId: z.ZodOptional<z.ZodString>;
} & {
    previousStatus: z.ZodString;
    newStatus: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    previousStatus: string;
    newStatus: string;
    reason?: string | undefined;
    actorId?: string | undefined;
}, {
    tenantId: string;
    previousStatus: string;
    newStatus: string;
    reason?: string | undefined;
    actorId?: string | undefined;
}>;
export declare const TenantTierChangedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    actorId: z.ZodOptional<z.ZodString>;
} & {
    previousTier: z.ZodString;
    newTier: z.ZodString;
    effectiveAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    previousTier: string;
    newTier: string;
    actorId?: string | undefined;
    effectiveAt?: string | undefined;
}, {
    tenantId: string;
    previousTier: string;
    newTier: string;
    actorId?: string | undefined;
    effectiveAt?: string | undefined;
}>;
export type TenantCreatedPayload = z.infer<typeof TenantCreatedPayloadSchema>;
export type TenantStatusChangedPayload = z.infer<typeof TenantStatusChangedPayloadSchema>;
export type TenantTierChangedPayload = z.infer<typeof TenantTierChangedPayloadSchema>;
export declare const TENANT_EVENT_SCHEMAS: {
    readonly "spancle.tenant.created": z.ZodObject<{
        tenantId: z.ZodString;
        actorId: z.ZodOptional<z.ZodString>;
    } & {
        name: z.ZodString;
        slug: z.ZodString;
        tier: z.ZodString;
        ownerEmail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        tenantId: string;
        slug: string;
        tier: string;
        ownerEmail: string;
        actorId?: string | undefined;
    }, {
        name: string;
        tenantId: string;
        slug: string;
        tier: string;
        ownerEmail: string;
        actorId?: string | undefined;
    }>;
    readonly "spancle.tenant.activated": z.ZodObject<{
        tenantId: z.ZodString;
        actorId: z.ZodOptional<z.ZodString>;
    } & {
        previousStatus: z.ZodString;
        newStatus: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string | undefined;
        actorId?: string | undefined;
    }, {
        tenantId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string | undefined;
        actorId?: string | undefined;
    }>;
    readonly "spancle.tenant.suspended": z.ZodObject<{
        tenantId: z.ZodString;
        actorId: z.ZodOptional<z.ZodString>;
    } & {
        previousStatus: z.ZodString;
        newStatus: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string | undefined;
        actorId?: string | undefined;
    }, {
        tenantId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string | undefined;
        actorId?: string | undefined;
    }>;
    readonly "spancle.tenant.terminated": z.ZodObject<{
        tenantId: z.ZodString;
        actorId: z.ZodOptional<z.ZodString>;
    } & {
        previousStatus: z.ZodString;
        newStatus: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string | undefined;
        actorId?: string | undefined;
    }, {
        tenantId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string | undefined;
        actorId?: string | undefined;
    }>;
    readonly "spancle.tenant.tier_changed": z.ZodObject<{
        tenantId: z.ZodString;
        actorId: z.ZodOptional<z.ZodString>;
    } & {
        previousTier: z.ZodString;
        newTier: z.ZodString;
        effectiveAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        previousTier: string;
        newTier: string;
        actorId?: string | undefined;
        effectiveAt?: string | undefined;
    }, {
        tenantId: string;
        previousTier: string;
        newTier: string;
        actorId?: string | undefined;
        effectiveAt?: string | undefined;
    }>;
};
//# sourceMappingURL=tenant.events.d.ts.map
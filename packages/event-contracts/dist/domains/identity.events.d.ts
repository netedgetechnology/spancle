import { z } from 'zod';
export declare const LoginSuccessPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    identityId: z.ZodString;
    userId: z.ZodString;
} & {
    ipAddress: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    identityId: string;
    userId: string;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    sessionId?: string | undefined;
}, {
    tenantId: string;
    identityId: string;
    userId: string;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    sessionId?: string | undefined;
}>;
export declare const LoginFailedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    identityId: z.ZodString;
    userId: z.ZodString;
} & {
    reason: z.ZodString;
    attemptCount: z.ZodNumber;
    ipAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    identityId: string;
    userId: string;
    reason: string;
    attemptCount: number;
    ipAddress?: string | undefined;
}, {
    tenantId: string;
    identityId: string;
    userId: string;
    reason: string;
    attemptCount: number;
    ipAddress?: string | undefined;
}>;
export declare const PasswordChangedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    identityId: z.ZodString;
    userId: z.ZodString;
} & {
    changedBy: z.ZodString;
    triggeredBy: z.ZodEnum<["user", "admin", "reset_flow"]>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    identityId: string;
    userId: string;
    changedBy: string;
    triggeredBy: "user" | "admin" | "reset_flow";
}, {
    tenantId: string;
    identityId: string;
    userId: string;
    changedBy: string;
    triggeredBy: "user" | "admin" | "reset_flow";
}>;
export declare const AccountLockedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    identityId: z.ZodString;
    userId: z.ZodString;
} & {
    lockedUntil: z.ZodString;
    reason: z.ZodString;
    attemptCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    identityId: string;
    userId: string;
    reason: string;
    attemptCount: number;
    lockedUntil: string;
}, {
    tenantId: string;
    identityId: string;
    userId: string;
    reason: string;
    attemptCount: number;
    lockedUntil: string;
}>;
export declare const IdentityCreatedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    identityId: z.ZodString;
    userId: z.ZodString;
} & {
    email: z.ZodString;
    createdBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    tenantId: string;
    identityId: string;
    userId: string;
    createdBy?: string | undefined;
}, {
    email: string;
    tenantId: string;
    identityId: string;
    userId: string;
    createdBy?: string | undefined;
}>;
export type LoginSuccessPayload = z.infer<typeof LoginSuccessPayloadSchema>;
export type LoginFailedPayload = z.infer<typeof LoginFailedPayloadSchema>;
export type PasswordChangedPayload = z.infer<typeof PasswordChangedPayloadSchema>;
export type AccountLockedPayload = z.infer<typeof AccountLockedPayloadSchema>;
export type IdentityCreatedPayload = z.infer<typeof IdentityCreatedPayloadSchema>;
export declare const IDENTITY_EVENT_SCHEMAS: {
    readonly "spancle.identity.login_success": z.ZodObject<{
        tenantId: z.ZodString;
        identityId: z.ZodString;
        userId: z.ZodString;
    } & {
        ipAddress: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        sessionId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        identityId: string;
        userId: string;
        ipAddress?: string | undefined;
        userAgent?: string | undefined;
        sessionId?: string | undefined;
    }, {
        tenantId: string;
        identityId: string;
        userId: string;
        ipAddress?: string | undefined;
        userAgent?: string | undefined;
        sessionId?: string | undefined;
    }>;
    readonly "spancle.identity.login_failed": z.ZodObject<{
        tenantId: z.ZodString;
        identityId: z.ZodString;
        userId: z.ZodString;
    } & {
        reason: z.ZodString;
        attemptCount: z.ZodNumber;
        ipAddress: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        identityId: string;
        userId: string;
        reason: string;
        attemptCount: number;
        ipAddress?: string | undefined;
    }, {
        tenantId: string;
        identityId: string;
        userId: string;
        reason: string;
        attemptCount: number;
        ipAddress?: string | undefined;
    }>;
    readonly "spancle.identity.password_changed": z.ZodObject<{
        tenantId: z.ZodString;
        identityId: z.ZodString;
        userId: z.ZodString;
    } & {
        changedBy: z.ZodString;
        triggeredBy: z.ZodEnum<["user", "admin", "reset_flow"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        identityId: string;
        userId: string;
        changedBy: string;
        triggeredBy: "user" | "admin" | "reset_flow";
    }, {
        tenantId: string;
        identityId: string;
        userId: string;
        changedBy: string;
        triggeredBy: "user" | "admin" | "reset_flow";
    }>;
    readonly "spancle.identity.account_locked": z.ZodObject<{
        tenantId: z.ZodString;
        identityId: z.ZodString;
        userId: z.ZodString;
    } & {
        lockedUntil: z.ZodString;
        reason: z.ZodString;
        attemptCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        identityId: string;
        userId: string;
        reason: string;
        attemptCount: number;
        lockedUntil: string;
    }, {
        tenantId: string;
        identityId: string;
        userId: string;
        reason: string;
        attemptCount: number;
        lockedUntil: string;
    }>;
    readonly "spancle.identity.created": z.ZodObject<{
        tenantId: z.ZodString;
        identityId: z.ZodString;
        userId: z.ZodString;
    } & {
        email: z.ZodString;
        createdBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        tenantId: string;
        identityId: string;
        userId: string;
        createdBy?: string | undefined;
    }, {
        email: string;
        tenantId: string;
        identityId: string;
        userId: string;
        createdBy?: string | undefined;
    }>;
};
//# sourceMappingURL=identity.events.d.ts.map
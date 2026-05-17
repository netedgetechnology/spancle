import { z } from 'zod';
import type { AuditFields, Address, UUID } from './common.types';
export declare const TenantStatusSchema: z.ZodEnum<["pending", "active", "suspended", "terminated", "trial"]>;
export type TenantStatus = z.infer<typeof TenantStatusSchema>;
export declare const TenantTierSchema: z.ZodEnum<["free", "starter", "growth", "pro", "enterprise"]>;
export type TenantTier = z.infer<typeof TenantTierSchema>;
export declare const TenantSettingsSchema: z.ZodObject<{
    ownerName: z.ZodOptional<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
    dateFormat: z.ZodDefault<z.ZodString>;
    allowPublicBookings: z.ZodDefault<z.ZodBoolean>;
    requireMfa: z.ZodDefault<z.ZodBoolean>;
    maxSessionDurationMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    timezone: string;
    locale: string;
    dateFormat: string;
    allowPublicBookings: boolean;
    requireMfa: boolean;
    maxSessionDurationMs: number;
    ownerName?: string | undefined;
}, {
    currency?: string | undefined;
    ownerName?: string | undefined;
    timezone?: string | undefined;
    locale?: string | undefined;
    dateFormat?: string | undefined;
    allowPublicBookings?: boolean | undefined;
    requireMfa?: boolean | undefined;
    maxSessionDurationMs?: number | undefined;
}>;
export type TenantSettings = z.infer<typeof TenantSettingsSchema>;
export declare const CreateTenantSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    tier: z.ZodDefault<z.ZodEnum<["free", "starter", "growth", "pro", "enterprise"]>>;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodObject<{
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodString;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    }, {
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    }>>;
    settings: z.ZodOptional<z.ZodObject<{
        ownerName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        locale: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        dateFormat: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        allowPublicBookings: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        requireMfa: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        maxSessionDurationMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        currency?: string | undefined;
        ownerName?: string | undefined;
        timezone?: string | undefined;
        locale?: string | undefined;
        dateFormat?: string | undefined;
        allowPublicBookings?: boolean | undefined;
        requireMfa?: boolean | undefined;
        maxSessionDurationMs?: number | undefined;
    }, {
        currency?: string | undefined;
        ownerName?: string | undefined;
        timezone?: string | undefined;
        locale?: string | undefined;
        dateFormat?: string | undefined;
        allowPublicBookings?: boolean | undefined;
        requireMfa?: boolean | undefined;
        maxSessionDurationMs?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    slug: string;
    tier: "pro" | "free" | "starter" | "growth" | "enterprise";
    phone?: string | undefined;
    address?: {
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    } | undefined;
    settings?: {
        currency?: string | undefined;
        ownerName?: string | undefined;
        timezone?: string | undefined;
        locale?: string | undefined;
        dateFormat?: string | undefined;
        allowPublicBookings?: boolean | undefined;
        requireMfa?: boolean | undefined;
        maxSessionDurationMs?: number | undefined;
    } | undefined;
}, {
    name: string;
    email: string;
    slug: string;
    tier?: "pro" | "free" | "starter" | "growth" | "enterprise" | undefined;
    phone?: string | undefined;
    address?: {
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    } | undefined;
    settings?: {
        currency?: string | undefined;
        ownerName?: string | undefined;
        timezone?: string | undefined;
        locale?: string | undefined;
        dateFormat?: string | undefined;
        allowPublicBookings?: boolean | undefined;
        requireMfa?: boolean | undefined;
        maxSessionDurationMs?: number | undefined;
    } | undefined;
}>;
export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;
export interface Tenant extends AuditFields {
    id: UUID;
    name: string;
    slug: string;
    status: TenantStatus;
    tier: TenantTier;
    email: string;
    phone?: string;
    address?: Address;
    settings: TenantSettings;
    logoUrl?: string;
    isDeleted: boolean;
}
//# sourceMappingURL=tenant.types.d.ts.map
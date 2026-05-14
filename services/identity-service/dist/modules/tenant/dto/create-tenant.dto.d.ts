declare class TenantSettingsDto {
    timezone?: string;
    locale?: string;
    currency?: string;
    dateFormat?: string;
    allowPublicBookings?: boolean;
    requireMfa?: boolean;
    maxSessionDurationMs?: number;
}
export declare class CreateTenantDto {
    name: string;
    /**
     * URL-safe slug: lowercase alphanumeric + hyphens only.
     * 2–63 chars (max subdomain label length per RFC 1123).
     * Immutable after creation.
     */
    slug: string;
    email: string;
    phone?: string;
    tier?: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';
    settings?: TenantSettingsDto;
}
export declare class UpdateTenantDto {
    name?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
}
export declare class UpdateTenantSettingsDto {
    settings: TenantSettingsDto;
}
export declare class TenantStatusTransitionDto {
    reason: string;
}
export declare class ChangeTierDto {
    tier: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';
}
export {};
//# sourceMappingURL=create-tenant.dto.d.ts.map
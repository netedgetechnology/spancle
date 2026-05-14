"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTenantSchema = exports.TenantSettingsSchema = exports.TenantTierSchema = exports.TenantStatusSchema = void 0;
const zod_1 = require("zod");
const common_types_1 = require("./common.types");
exports.TenantStatusSchema = zod_1.z.enum(['pending', 'active', 'suspended', 'terminated', 'trial']);
exports.TenantTierSchema = zod_1.z.enum(['free', 'starter', 'growth', 'pro', 'enterprise']);
exports.TenantSettingsSchema = zod_1.z.object({
    timezone: zod_1.z.string().default('UTC'),
    locale: zod_1.z.string().default('en-GB'),
    currency: zod_1.z.string().length(3).default('GBP'),
    dateFormat: zod_1.z.string().default('DD/MM/YYYY'),
    allowPublicBookings: zod_1.z.boolean().default(false),
    requireMfa: zod_1.z.boolean().default(false),
    maxSessionDurationMs: zod_1.z.number().int().positive().default(8 * 60 * 60 * 1000),
});
exports.CreateTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    tier: exports.TenantTierSchema.default('free'),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().max(30).optional(),
    address: common_types_1.AddressSchema.optional(),
    settings: exports.TenantSettingsSchema.partial().optional(),
});
//# sourceMappingURL=tenant.types.js.map
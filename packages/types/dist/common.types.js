"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneySchema = exports.AddressSchema = exports.PaginationQuerySchema = void 0;
const zod_1 = require("zod");
// ── Pagination ────────────────────────────────────────────────────────────────
exports.PaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortDir: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    search: zod_1.z.string().max(200).optional(),
});
// ── Address ───────────────────────────────────────────────────────────────────
exports.AddressSchema = zod_1.z.object({
    line1: zod_1.z.string().max(255),
    line2: zod_1.z.string().max(255).optional(),
    city: zod_1.z.string().max(100),
    state: zod_1.z.string().max(100).optional(),
    postalCode: zod_1.z.string().max(20),
    country: zod_1.z.string().length(2), // ISO 3166-1 alpha-2
});
// ── Money ─────────────────────────────────────────────────────────────────────
exports.MoneySchema = zod_1.z.object({
    amount: zod_1.z.number().int().min(0), // stored in minor units (pence/cents)
    currency: zod_1.z.string().length(3), // ISO 4217
});
//# sourceMappingURL=common.types.js.map
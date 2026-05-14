"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCoachSchema = exports.CreatePlayerSchema = exports.PlayerStatusSchema = exports.CoachLicenseSchema = exports.PlayerLevelSchema = void 0;
const zod_1 = require("zod");
exports.PlayerLevelSchema = zod_1.z.enum([
    'beginner', 'intermediate', 'advanced', 'elite', 'professional',
]);
exports.CoachLicenseSchema = zod_1.z.enum([
    'none', 'level_1', 'level_2', 'level_3', 'pro', 'elite',
]);
exports.PlayerStatusSchema = zod_1.z.enum([
    'prospect', 'registered', 'active', 'inactive', 'suspended', 'graduated',
]);
exports.CreatePlayerSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    academyId: zod_1.z.string().uuid(),
    level: exports.PlayerLevelSchema.default('beginner'),
    position: zod_1.z.string().max(50).optional(),
    jerseyNumber: zod_1.z.number().int().min(1).max(999).optional(),
    sport: zod_1.z.string().max(50),
    joinDate: zod_1.z.string().date().optional(),
});
exports.CreateCoachSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    academyId: zod_1.z.string().uuid(),
    license: exports.CoachLicenseSchema.default('none'),
    speciality: zod_1.z.string().max(100).optional(),
    sports: zod_1.z.array(zod_1.z.string().max(50)).min(1),
});
//# sourceMappingURL=academy.types.js.map
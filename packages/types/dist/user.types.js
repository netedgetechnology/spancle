"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserSchema = exports.CreateUserSchema = exports.GenderSchema = void 0;
const zod_1 = require("zod");
exports.GenderSchema = zod_1.z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']);
exports.CreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(254),
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    phone: zod_1.z.string().max(30).optional(),
    dateOfBirth: zod_1.z.string().date().optional(),
    gender: exports.GenderSchema.optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    password: zod_1.z.string().min(8).max(128),
    roleId: zod_1.z.string().uuid().optional(),
});
exports.UpdateUserSchema = exports.CreateUserSchema
    .omit({ email: true, password: true })
    .partial();
//# sourceMappingURL=user.types.js.map
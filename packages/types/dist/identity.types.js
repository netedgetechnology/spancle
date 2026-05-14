"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtPayloadSchema = exports.RefreshTokenSchema = exports.TokenPairSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(254),
    password: zod_1.z.string().min(8).max(128),
});
exports.TokenPairSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    expiresIn: zod_1.z.number().int().positive(),
    tokenType: zod_1.z.literal('Bearer').default('Bearer'),
});
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.JwtPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string().uuid(), // identityId
    userId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    role: zod_1.z.string(),
    iat: zod_1.z.number(),
    exp: zod_1.z.number(),
    iss: zod_1.z.string(),
    jti: zod_1.z.string().optional(),
});
//# sourceMappingURL=identity.types.js.map
import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const TokenPairSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    expiresIn: z.ZodNumber;
    tokenType: z.ZodDefault<z.ZodLiteral<"Bearer">>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: "Bearer";
}, {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType?: "Bearer" | undefined;
}>;
export type TokenPair = z.infer<typeof TokenPairSchema>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export declare const JwtPayloadSchema: z.ZodObject<{
    sub: z.ZodString;
    userId: z.ZodString;
    tenantId: z.ZodString;
    role: z.ZodString;
    iat: z.ZodNumber;
    exp: z.ZodNumber;
    iss: z.ZodString;
    jti: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sub: string;
    userId: string;
    tenantId: string;
    role: string;
    iat: number;
    exp: number;
    iss: string;
    jti?: string | undefined;
}, {
    sub: string;
    userId: string;
    tenantId: string;
    role: string;
    iat: number;
    exp: number;
    iss: string;
    jti?: string | undefined;
}>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export interface Identity extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    userId: UUID;
    email: string;
    isActive: boolean;
    isEmailVerified: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
}
//# sourceMappingURL=identity.types.d.ts.map
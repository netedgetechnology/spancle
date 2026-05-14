import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const GenderSchema: z.ZodEnum<["male", "female", "non_binary", "prefer_not_to_say"]>;
export type Gender = z.infer<typeof GenderSchema>;
export declare const CreateUserSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "non_binary", "prefer_not_to_say"]>>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    roleId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    dateOfBirth?: string | undefined;
    gender?: "male" | "female" | "non_binary" | "prefer_not_to_say" | undefined;
    avatarUrl?: string | undefined;
    roleId?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    dateOfBirth?: string | undefined;
    gender?: "male" | "female" | "non_binary" | "prefer_not_to_say" | undefined;
    avatarUrl?: string | undefined;
    roleId?: string | undefined;
}>;
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    gender: z.ZodOptional<z.ZodOptional<z.ZodEnum<["male", "female", "non_binary", "prefer_not_to_say"]>>>;
    avatarUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    roleId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | undefined;
    gender?: "male" | "female" | "non_binary" | "prefer_not_to_say" | undefined;
    avatarUrl?: string | undefined;
    roleId?: string | undefined;
}, {
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | undefined;
    gender?: "male" | "female" | "non_binary" | "prefer_not_to_say" | undefined;
    avatarUrl?: string | undefined;
    roleId?: string | undefined;
}>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export interface User extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    avatarUrl?: string;
    isActive: boolean;
    isDeleted: boolean;
    roleId?: UUID;
}
//# sourceMappingURL=user.types.d.ts.map
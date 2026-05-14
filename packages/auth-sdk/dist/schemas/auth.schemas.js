"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordSchema = exports.ChangePasswordSchema = exports.RegisterSchema = exports.LoginSchema = exports.PasswordSchema = exports.EmailSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("@spancle/constants");
/**
 * Auth validation schemas — used by both backend DTOs and frontend forms.
 */
exports.EmailSchema = zod_1.z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must not exceed 254 characters')
    .toLowerCase()
    .trim();
exports.PasswordSchema = zod_1.z
    .string()
    .min(constants_1.PASSWORD.MIN_LENGTH, `Password must be at least ${constants_1.PASSWORD.MIN_LENGTH} characters`)
    .max(constants_1.PASSWORD.MAX_LENGTH, `Password must not exceed ${constants_1.PASSWORD.MAX_LENGTH} characters`)
    .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
    .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
    .refine((p) => /[0-9]/.test(p), 'Password must contain at least one number');
exports.LoginSchema = zod_1.z.object({
    email: exports.EmailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.RegisterSchema = zod_1.z.object({
    email: exports.EmailSchema,
    password: exports.PasswordSchema,
    firstName: zod_1.z.string().min(1).max(100).trim(),
    lastName: zod_1.z.string().min(1).max(100).trim(),
});
exports.ChangePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: exports.PasswordSchema,
    confirmPassword: zod_1.z.string().min(1, 'Please confirm your new password'),
})
    .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
exports.ResetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1),
    newPassword: exports.PasswordSchema,
    confirmPassword: zod_1.z.string().min(1),
})
    .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
//# sourceMappingURL=auth.schemas.js.map
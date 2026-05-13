import { z } from 'zod';
import { PASSWORD } from '@spancle/constants';

/**
 * Auth validation schemas — used by both backend DTOs and frontend forms.
 */

export const EmailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email must not exceed 254 characters')
  .toLowerCase()
  .trim();

export const PasswordSchema = z
  .string()
  .min(PASSWORD.MIN_LENGTH, `Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
  .max(PASSWORD.MAX_LENGTH, `Password must not exceed ${PASSWORD.MAX_LENGTH} characters`)
  .refine(
    (p) => /[A-Z]/.test(p),
    'Password must contain at least one uppercase letter',
  )
  .refine(
    (p) => /[a-z]/.test(p),
    'Password must contain at least one lowercase letter',
  )
  .refine(
    (p) => /[0-9]/.test(p),
    'Password must contain at least one number',
  );

export const LoginSchema = z.object({
  email:    EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email:     EmailSchema,
  password:  PasswordSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName:  z.string().min(1).max(100).trim(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword:     PasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

export const ResetPasswordSchema = z
  .object({
    token:           z.string().min(1),
    newPassword:     PasswordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

export type LoginInput          = z.infer<typeof LoginSchema>;
export type RegisterInput       = z.infer<typeof RegisterSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ResetPasswordInput  = z.infer<typeof ResetPasswordSchema>;

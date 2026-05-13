import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const GenderSchema = z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']);
export type Gender = z.infer<typeof GenderSchema>;

export const CreateUserSchema = z.object({
  email:      z.string().email().max(254),
  firstName:  z.string().min(1).max(100),
  lastName:   z.string().min(1).max(100),
  phone:      z.string().max(30).optional(),
  dateOfBirth: z.string().date().optional(),
  gender:     GenderSchema.optional(),
  avatarUrl:  z.string().url().optional(),
  password:   z.string().min(8).max(128),
  roleId:     z.string().uuid().optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema
  .omit({ email: true, password: true })
  .partial();

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export interface User extends AuditFields {
  id:           UUID;
  tenantId:     TenantId;
  email:        string;
  firstName:    string;
  lastName:     string;
  fullName:     string;
  phone?:       string;
  dateOfBirth?: Date;
  gender?:      Gender;
  avatarUrl?:   string;
  isActive:     boolean;
  isDeleted:    boolean;
  roleId?:      UUID;
}

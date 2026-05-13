import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY     = 'spancle_roles';
export const IS_PUBLIC_KEY = 'spancle_public';

/** Declare which roles can access this handler/controller. */
export const Roles  = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Mark handler as public — bypasses all auth guards. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

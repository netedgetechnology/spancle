import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY     = 'spancle_roles';
export const IS_PUBLIC_KEY = 'spancle_public';

export const Roles  = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

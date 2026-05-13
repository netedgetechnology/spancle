import { SetMetadata } from '@nestjs/common';
import type { SystemRole } from '@spancle/types';

export const ROLES_KEY       = 'spancle:roles'     as const;
export const IS_PUBLIC_KEY   = 'spancle:is_public' as const;
export const ACTOR_KEY       = 'spancle:actor'     as const;

export const Roles = (...roles: (SystemRole | string)[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY     = 'spancle:roles'     as const;
export const IS_PUBLIC_KEY = 'spancle:is_public' as const;

/** @Roles(...roles) — restrict route to specified roles. */
export const Roles  = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * @Public() — mark a route as publicly accessible.
 * Bypasses JwtAuthGuard entirely.
 * Use ONLY on endpoints that intentionally serve unauthenticated requests
 * (e.g. public CMS published sections, blog by-slug, package listing).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import type { SystemRole, Permission } from '@spancle/types';
/**
 * Metadata keys — used by RolesGuard and PermissionsGuard to read reflector data.
 */
export declare const ROLES_KEY: "spancle:roles";
export declare const PERMISSIONS_KEY: "spancle:permissions";
export declare const IS_PUBLIC_KEY: "spancle:is_public";
/**
 * @Roles(...roles) — restricts a route to users holding one of the given roles.
 *
 * Evaluated by RolesGuard using RbacEngine.hasRole().
 *
 * Usage:
 *   @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
 *   @Get('reports')
 *   getReports() { ... }
 */
export declare const Roles: (...roles: (SystemRole | string)[]) => MethodDecorator & ClassDecorator;
/**
 * @RequirePermissions(...permissions) — restricts a route to users who hold
 * ALL of the specified resource.action permissions.
 *
 * Evaluated by PermissionsGuard using RbacEngine.can().
 *
 * Usage:
 *   @RequirePermissions({ resource: 'booking', action: 'create' })
 *   @Post('bookings')
 *   createBooking() { ... }
 */
export declare const RequirePermissions: (...permissions: Array<Pick<Permission, "resource" | "action" | "scope">>) => MethodDecorator & ClassDecorator;
/**
 * @Public() — marks a route as publicly accessible.
 * JwtAuthGuard, RolesGuard and PermissionsGuard all short-circuit on public routes.
 *
 * Use sparingly — only on genuinely unauthenticated endpoints (login, health).
 *
 * Usage:
 *   @Public()
 *   @Post('auth/login')
 *   login() { ... }
 */
export declare const Public: () => MethodDecorator & ClassDecorator;
//# sourceMappingURL=roles.decorator.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Public = exports.RequirePermissions = exports.Roles = exports.IS_PUBLIC_KEY = exports.PERMISSIONS_KEY = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
/**
 * Metadata keys — used by RolesGuard and PermissionsGuard to read reflector data.
 */
exports.ROLES_KEY = 'spancle:roles';
exports.PERMISSIONS_KEY = 'spancle:permissions';
exports.IS_PUBLIC_KEY = 'spancle:is_public';
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
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
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
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
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
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
//# sourceMappingURL=roles.decorator.js.map
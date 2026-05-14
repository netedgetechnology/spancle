/**
 * AuthModule — the authentication and authorisation foundation.
 *
 * Exports:
 *   - JwtModule       → for signing tokens in other modules
 *   - TokenService    → for programmatic token management
 *   - PasswordService → for identity creation in UserModule
 *   - AuthRepository  → for JwtStrategy access to blacklist
 *
 * Guards (JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard) are
 * registered as global guards in AppModule — not here.
 * This keeps AuthModule focused on auth logic, not cross-cutting guards.
 */
export declare class AuthModule {
}
//# sourceMappingURL=auth.module.d.ts.map
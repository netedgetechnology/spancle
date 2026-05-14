import type { PermissionCheck, RbacContext, RbacResult } from './rbac.types';
/**
 * RbacEngine — stateless permission evaluation engine.
 *
 * Evaluation order:
 *   1. SUPER_ADMIN wildcard — always allow
 *   2. Explicit custom permissions from Role entity
 *   3. Default permissions from system role
 *   4. Deny by default
 *
 * All methods are pure functions — no side effects, no external calls.
 */
export declare class RbacEngine {
    /**
     * Evaluates whether a context is permitted to perform a given action.
     */
    static evaluate(context: RbacContext, check: PermissionCheck): RbacResult;
    /** Convenience method — returns boolean. */
    static can(context: RbacContext, check: PermissionCheck): boolean;
    /** Checks if role has at minimum one of the given roles. */
    static hasRole(context: RbacContext, roles: string[]): boolean;
    /** Checks if an action is scoped to own resources only. */
    static isOwnScopeOnly(context: RbacContext, check: PermissionCheck): boolean;
    private static findMatch;
}
//# sourceMappingURL=rbac.engine.d.ts.map
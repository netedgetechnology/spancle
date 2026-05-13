import type { Permission } from '@spancle/types';
import { ROLE_DEFAULT_PERMISSIONS } from './rbac.constants';
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
export class RbacEngine {

  /**
   * Evaluates whether a context is permitted to perform a given action.
   */
  static evaluate(context: RbacContext, check: PermissionCheck): RbacResult {

    // 1. Super admin wildcard
    if (context.role === 'SUPER_ADMIN') {
      return {
        decision: 'allow',
        reason: 'SUPER_ADMIN has global wildcard permission',
      };
    }

    // 2. Custom permissions from the role entity
    const customPermissions = context.permissions ?? [];
    const customMatch = RbacEngine.findMatch(customPermissions, check);
    if (customMatch) {
      return {
        decision: 'allow',
        reason: `Matched custom permission: ${customMatch.resource}.${customMatch.action}`,
        matchedRule: customMatch,
      };
    }

    // 3. Default role permissions
    const defaults = ROLE_DEFAULT_PERMISSIONS[context.role] ?? [];
    const defaultMatch = RbacEngine.findMatch(defaults, check);
    if (defaultMatch) {
      return {
        decision: 'allow',
        reason: `Matched default role permission: ${defaultMatch.resource}.${defaultMatch.action}`,
        matchedRule: defaultMatch,
      };
    }

    // 4. Deny
    return {
      decision: 'deny',
      reason: `No matching permission for ${check.resource}.${check.action} (role: ${context.role})`,
    };
  }

  /** Convenience method — returns boolean. */
  static can(context: RbacContext, check: PermissionCheck): boolean {
    return RbacEngine.evaluate(context, check).decision === 'allow';
  }

  /** Checks if role has at minimum one of the given roles. */
  static hasRole(context: RbacContext, roles: string[]): boolean {
    return roles.includes(context.role);
  }

  /** Checks if an action is scoped to own resources only. */
  static isOwnScopeOnly(context: RbacContext, check: PermissionCheck): boolean {
    const permissions = [
      ...(context.permissions ?? []),
      ...(ROLE_DEFAULT_PERMISSIONS[context.role] ?? []),
    ];
    const match = RbacEngine.findMatch(permissions, check);
    return match?.scope === 'own';
  }

  private static findMatch(
    permissions: Permission[],
    check: PermissionCheck,
  ): Permission | undefined {
    return permissions.find(
      (p) =>
        (p.resource === check.resource || p.resource === '*') &&
        (p.action === check.action || p.action === 'manage') &&
        (check.scope === undefined || p.scope === check.scope || p.scope === 'global'),
    );
  }
}

import type { Permission, SystemRole } from '@spancle/types';

export interface RbacContext {
  userId:   string;
  tenantId: string;
  role:     SystemRole | string;
  permissions?: Permission[];
}

export interface PermissionCheck {
  resource: string;
  action:   Permission['action'];
  scope?:   Permission['scope'];
}

export type RbacDecision = 'allow' | 'deny';

export interface RbacResult {
  decision:     RbacDecision;
  reason:       string;
  matchedRule?: Permission;
}

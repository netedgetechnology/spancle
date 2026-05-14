import type { BranchStatus } from '../entities/branch.entity';
export declare enum BranchEventNames {
    CREATED = "spancle.branch.created",
    UPDATED = "spancle.branch.updated",
    STATUS_CHANGED = "spancle.branch.status_changed",
    MANAGER_ASSIGNED = "spancle.branch.manager_assigned",
    MANAGER_REMOVED = "spancle.branch.manager_removed",
    DELETED = "spancle.branch.deleted"
}
export interface BranchEventPayload {
    tenantId: string;
    branchId: string;
    actorId: string;
    timestamp: string;
}
export interface BranchStatusChangedPayload extends BranchEventPayload {
    from: BranchStatus;
    to: BranchStatus;
}
export interface BranchManagerAssignedPayload extends BranchEventPayload {
    managerUserId: string | null;
    previousManagerUserId: string | null;
}
//# sourceMappingURL=branch.events.d.ts.map
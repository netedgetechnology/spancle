import type { SportStatus } from '../entities/sport.entity';
export declare enum SportEventNames {
    CREATED = "spancle.sport.created",
    UPDATED = "spancle.sport.updated",
    STATUS_CHANGED = "spancle.sport.status_changed",
    BRANCHES_ASSIGNED = "spancle.sport.branches_assigned",
    DELETED = "spancle.sport.deleted"
}
export interface SportEventPayload {
    tenantId: string;
    sportId: string;
    actorId: string;
    timestamp: string;
}
export interface SportStatusChangedPayload extends SportEventPayload {
    from: SportStatus;
    to: SportStatus;
}
export interface SportBranchesAssignedPayload extends SportEventPayload {
    branchIds: string[];
    previousBranchIds: string[];
}
//# sourceMappingURL=sport.events.d.ts.map
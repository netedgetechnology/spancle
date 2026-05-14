import type { CourtStatus } from '../entities/court.entity';
export declare enum CourtEventNames {
    CREATED = "spancle.court.created",
    BULK_GENERATED = "spancle.court.bulk_generated",
    UPDATED = "spancle.court.updated",
    STATUS_CHANGED = "spancle.court.status_changed",
    MAINTENANCE_STARTED = "spancle.court.maintenance_started",
    MAINTENANCE_RESOLVED = "spancle.court.maintenance_resolved",
    DELETED = "spancle.court.deleted"
}
export interface CourtEventPayload {
    tenantId: string;
    courtId: string;
    branchId: string;
    actorId: string;
    timestamp: string;
}
export interface CourtStatusChangedPayload extends CourtEventPayload {
    from: CourtStatus;
    to: CourtStatus;
}
export interface CourtMaintenancePayload extends CourtEventPayload {
    maintenanceNote: string;
    maintenanceExpectedEnd: string | null;
}
export interface CourtBulkGeneratedPayload {
    tenantId: string;
    branchId: string;
    courtIds: string[];
    count: number;
    skipped: number;
    actorId: string;
    timestamp: string;
}
//# sourceMappingURL=court.events.d.ts.map
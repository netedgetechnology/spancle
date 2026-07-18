"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPackageAssignmentSnapshot = toPackageAssignmentSnapshot;
function toPackageAssignmentSnapshot(a) {
    return {
        planId: a.planId,
        packageId: a.packageId,
        packageSlug: a.packageSlug,
        tierKey: a.tierKey,
        packageVersionId: a.packageVersion?.id ?? null,
        packageVersion: a.packageVersion?.version ?? null,
        packageStatus: a.packageStatus,
        isEligible: a.isEligible,
        effectiveFeatures: a.effectiveFeatures,
        effectiveLimits: a.effectiveLimits,
        resolvedAt: a.resolvedAt.toISOString(),
    };
}
//# sourceMappingURL=package-assignment.model.js.map
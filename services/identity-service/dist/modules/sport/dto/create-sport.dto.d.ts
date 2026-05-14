declare const SPORT_STATUSES: readonly ["active", "inactive"];
export declare class CreateSportDto {
    name: string;
    /**
     * URL-safe slug — lowercase alphanumeric + hyphens.
     * Unique per tenant. Auto-generated from name if not supplied.
     */
    slug: string;
    description?: string;
    /**
     * Emoji or icon identifier — e.g. "⚽", "🏊", "tennis-ball".
     * Max 100 chars to accommodate icon system identifiers.
     */
    icon?: string;
    /**
     * Hex colour code — must match #RRGGBB format.
     * e.g. "#3b82f6"
     */
    color?: string;
    /**
     * Arbitrary sport configuration.
     * Common keys: teamSize, sessionDurationMins, ageGroups, equipment.
     * Validated for structure in SportService; stored as-is in JSONB.
     */
    config?: Record<string, unknown>;
    status?: typeof SPORT_STATUSES[number];
    sortOrder?: number;
    /**
     * Initial branch IDs to assign this sport to.
     * Optional — branches can be assigned later via PATCH /sports/:id/branches.
     * All IDs must belong to the same tenant.
     */
    branchIds?: string[];
}
export declare class UpdateSportDto {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    /**
     * Config is merged with existing — never full-replaced.
     * Pass only the keys you want to update.
     */
    config?: Record<string, unknown>;
    status?: typeof SPORT_STATUSES[number];
    sortOrder?: number;
}
/**
 * AssignBranchesDto — replaces the full set of branch mappings for a sport.
 *
 * Passing an empty array removes all branch mappings (sport becomes
 * globally available, subject to business rules).
 *
 * All branchIds must belong to the same tenant as the sport.
 * Archived branches are rejected.
 */
export declare class AssignBranchesDto {
    branchIds: string[];
}
export declare class SportStatusDto {
    status: typeof SPORT_STATUSES[number];
}
export {};
//# sourceMappingURL=create-sport.dto.d.ts.map
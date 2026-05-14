/**
 * Sport status:
 *   active   — visible and bookable across assigned branches
 *   inactive — hidden from public booking; admin-visible only
 */
export type SportStatus = 'active' | 'inactive';
/**
 * SportEntity — a sport or activity offered by a tenant.
 *
 * Design decisions:
 *   - No hard limit on sports per tenant (requirement: unlimited).
 *     Plan-based limits enforced separately in Sprint 3 via PlanLimitGuard.
 *
 *   - `config` JSONB: sport-specific configuration (e.g. team sizes,
 *     duration presets, scoring rules, equipment checklist).
 *     Intentionally untyped at entity level — validated in service layer.
 *     Sprint 3: add sportType enum + per-type JSON Schema validation.
 *
 *   - `icon`: emoji or icon identifier string (e.g. "⚽", "football",
 *     "mdi:soccer"). Kept as a free-form string for flexibility.
 *
 *   - `color`: hex colour string (e.g. "#3b82f6") for UI differentiation.
 *
 *   - Branch mapping is handled by SportBranchEntity (separate join table).
 *     A sport with no branch mappings is available at all branches (global).
 *     A sport with mappings is available only at those branches.
 *
 * Table: `sports`
 * Unique: (tenant_id, slug)
 */
export declare class SportEntity {
    id: string;
    tenantId: string;
    name: string;
    /**
     * URL-safe slug — unique per tenant.
     * e.g. "football", "5-a-side-football", "swimming-adults"
     */
    slug: string;
    description: string | null;
    /**
     * Emoji or icon identifier — e.g. "⚽", "🏊", "tennis-ball".
     * Rendered in the UI wherever the sport is listed.
     */
    icon: string | null;
    /**
     * Hex colour string — e.g. "#3b82f6".
     * Used to colour-code the sport in calendars and booking grids.
     */
    color: string | null;
    /**
     * Sport-specific configuration JSONB.
     *
     * Common keys (all optional):
     *   teamSize:         number    — players per team (e.g. 11 for football)
     *   minPlayers:       number    — minimum to run a session
     *   maxPlayers:       number    — max capacity per session
     *   sessionDurationMins: number — default session length
     *   ageGroups:        string[]  — e.g. ["under-8", "under-10", "adult"]
     *   equipment:        string[]  — required equipment list
     *   scoringSystem:    string    — e.g. "goals", "sets", "points"
     *   notes:            string    — admin notes
     */
    config: Record<string, unknown>;
    status: SportStatus;
    sortOrder: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=sport.entity.d.ts.map
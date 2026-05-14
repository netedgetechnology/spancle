"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PricingRuleValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRuleValidationService = void 0;
const common_1 = require("@nestjs/common");
const pricing_rule_repository_1 = require("../repositories/pricing-rule.repository");
/**
 * Allowed (ruleType, modifierType) combinations:
 *
 *   base    → percentage | fixed | absolute  (sets or adjusts the base)
 *   peak    → percentage | fixed             (surcharge, not price override)
 *   weekend → percentage | fixed
 *   holiday → percentage | fixed
 *   member  → percentage | fixed             (discount — negative values expected)
 *   custom  → percentage | fixed | absolute  (full flexibility)
 */
const ALLOWED_MODIFIER_TYPES = {
    base: ['percentage', 'fixed', 'absolute'],
    peak: ['percentage', 'fixed'],
    weekend: ['percentage', 'fixed'],
    holiday: ['percentage', 'fixed'],
    member: ['percentage', 'fixed'],
    custom: ['percentage', 'fixed', 'absolute'],
};
/**
 * PricingRuleValidationService — validates pricing rules before persistence.
 *
 * Runs on CREATE and UPDATE. Surfaces:
 *   - Hard errors   → operation rejected (400 / 422)
 *   - Soft warnings → operation allowed, warnings returned in response
 *
 * Validation categories:
 *   1. Semantic validation    — ruleType / modifierType compatibility
 *   2. Value range validation — percentage bounds, date ordering, time ordering
 *   3. Scope consistency     — scope enum matches the FK provided
 *   4. Conflict detection    — checks against existing active rules for this tenant
 */
let PricingRuleValidationService = PricingRuleValidationService_1 = class PricingRuleValidationService {
    constructor(pricingRuleRepository) {
        this.pricingRuleRepository = pricingRuleRepository;
        this.logger = new common_1.Logger(PricingRuleValidationService_1.name);
    }
    /**
     * Full validation pass for a pricing rule.
     * Throws BadRequestException on any ERROR-level finding.
     * Returns ConflictReport containing warnings (non-fatal).
     *
     * @param candidate  The rule data to validate (may be partial for updates)
     * @param tenantId   Tenant context
     * @param excludeId  ID to exclude from conflict queries (for updates)
     */
    async validate(candidate, tenantId, excludeId) {
        const errors = [];
        const warnings = [];
        const add = (entry) => {
            if (entry.level === 'error')
                errors.push(entry);
            else
                warnings.push(entry);
        };
        // 1. Semantic: ruleType + modifierType compatibility
        this.validateSemantics(candidate, add);
        // 2. Value ranges
        this.validateValueRanges(candidate, add);
        // 3. Scope FK consistency
        this.validateScopeConsistency(candidate, add);
        // 4. Time window ordering
        this.validateTimeWindow(candidate, add);
        // 5. Date range ordering
        this.validateDateRange(candidate, add);
        // Fail fast on structural errors before hitting the DB
        if (errors.length > 0) {
            throw new common_1.BadRequestException({
                message: 'Pricing rule validation failed',
                errors: errors.map((e) => ({ code: e.code, message: e.message })),
            });
        }
        // 6. Conflict detection against existing rules (DB queries)
        await this.detectConflicts(candidate, tenantId, excludeId, add);
        // Throw on any DB-derived errors too
        const errorConflicts = errors; // errors array is mutated by add()
        if (errors.length > 0) {
            throw new common_1.UnprocessableEntityException({
                message: 'Pricing rule conflicts with existing rules',
                errors: errors.map((e) => ({
                    code: e.code, message: e.message,
                    conflictingRuleId: e.conflictingRuleId,
                    conflictingRuleName: e.conflictingRuleName,
                })),
            });
        }
        return {
            hasErrors: false,
            hasWarnings: warnings.length > 0,
            errors: [],
            warnings,
        };
    }
    // ── 1. Semantic validation ────────────────────────────────────────────────
    validateSemantics(candidate, add) {
        const { ruleType, modifierType } = candidate;
        if (!ruleType || !modifierType)
            return; // partial update — skip
        const allowed = ALLOWED_MODIFIER_TYPES[ruleType] ?? [];
        if (!allowed.includes(modifierType)) {
            add({
                level: 'error',
                code: 'SEMANTIC_MISMATCH',
                message: `Rule type "${ruleType}" does not support modifier type "${modifierType}". ` +
                    `Allowed for ${ruleType}: ${allowed.join(', ')}.`,
            });
        }
        // Member discount with absolute = semantically wrong (would set a fixed absolute price
        // rather than apply a discount on top of the base)
        if (ruleType === 'member' && modifierType === 'absolute') {
            add({
                level: 'error',
                code: 'MEMBER_RULE_ABSOLUTE',
                message: 'Member discount rules must use "percentage" or "fixed" modifier types. ' +
                    '"absolute" would replace the full price instead of applying a discount.',
            });
        }
    }
    // ── 2. Value range validation ─────────────────────────────────────────────
    validateValueRanges(candidate, add) {
        const { modifierType, modifierValue, ruleType } = candidate;
        if (modifierValue === undefined || modifierValue === null)
            return;
        if (modifierType === 'percentage') {
            // Member discounts should be negative (−100 floor); surcharges 0–10000%
            if (ruleType === 'member' && modifierValue > 0) {
                add({
                    level: 'warning',
                    code: 'INVALID_PERCENTAGE_RANGE',
                    message: `Member discount rules typically have negative percentage values ` +
                        `(e.g. -10 for a 10% discount). Current value ${modifierValue}% would be a surcharge.`,
                });
            }
            if (modifierValue < -100) {
                add({
                    level: 'error',
                    code: 'INVALID_PERCENTAGE_RANGE',
                    message: `Percentage modifier cannot be less than -100% (would produce a negative price). ` +
                        `Received: ${modifierValue}%.`,
                });
            }
            if (modifierValue > 10_000) {
                add({
                    level: 'error',
                    code: 'INVALID_PERCENTAGE_RANGE',
                    message: `Percentage modifier cannot exceed 10000% (100× base price). ` +
                        `Received: ${modifierValue}%. Check for a typo.`,
                });
            }
        }
        if (modifierType === 'fixed' || modifierType === 'absolute') {
            if (modifierValue < 0 && ruleType !== 'member' && ruleType !== 'custom') {
                add({
                    level: 'warning',
                    code: 'INVALID_PERCENTAGE_RANGE',
                    message: `Negative fixed modifier on rule type "${ruleType}" may produce a price below zero. ` +
                        `The engine floors at 0, but verify this is intentional.`,
                });
            }
        }
    }
    // ── 3. Scope FK consistency ───────────────────────────────────────────────
    validateScopeConsistency(candidate, add) {
        const { scope, branchId, sportId, courtId } = candidate;
        if (!scope)
            return;
        const checks = [
            ['branch', branchId, scope === 'branch'],
            ['sport', sportId, scope === 'sport'],
            ['court', courtId, scope === 'court'],
        ];
        for (const [scopeName, fkValue, required] of checks) {
            if (required && !fkValue) {
                add({
                    level: 'error',
                    code: 'SCOPE_FK_MISMATCH',
                    message: `Scope is "${scopeName}" but ${scopeName}Id is missing. ` +
                        `Provide a valid ${scopeName}Id when scope = "${scopeName}".`,
                });
            }
            // Warn if a FK is set for a scope it doesn't belong to
            if (!required && fkValue && scope !== 'tenant') {
                add({
                    level: 'warning',
                    code: 'SCOPE_FK_MISMATCH',
                    message: `${scopeName}Id is set but scope is "${scope}". ` +
                        `The ${scopeName}Id will be ignored during rule matching.`,
                });
            }
        }
    }
    // ── 4. Time window validation ─────────────────────────────────────────────
    validateTimeWindow(candidate, add) {
        const { timeStart, timeEnd } = candidate;
        if (!timeStart || !timeEnd)
            return;
        const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!HH_MM.test(timeStart)) {
            add({
                level: 'error', code: 'INVALID_TIME_WINDOW',
                message: `timeStart "${timeStart}" is not a valid HH:MM time (24-hour format).`,
            });
            return;
        }
        if (!HH_MM.test(timeEnd)) {
            add({
                level: 'error', code: 'INVALID_TIME_WINDOW',
                message: `timeEnd "${timeEnd}" is not a valid HH:MM time (24-hour format).`,
            });
            return;
        }
        if (timeStart >= timeEnd) {
            add({
                level: 'error',
                code: 'INVALID_TIME_WINDOW',
                message: `timeStart (${timeStart}) must be before timeEnd (${timeEnd}).`,
            });
        }
        // Warn if the window is shorter than 30 minutes (probably a typo)
        const [sh, sm] = timeStart.split(':').map(Number);
        const [eh, em] = timeEnd.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        if (endMins - startMins < 30) {
            add({
                level: 'warning',
                code: 'INVALID_TIME_WINDOW',
                message: `Time window is less than 30 minutes (${timeStart}–${timeEnd}). ` +
                    `This may not match any slots. Verify this is intentional.`,
            });
        }
    }
    // ── 5. Date range validation ──────────────────────────────────────────────
    validateDateRange(candidate, add) {
        const { validFrom, validUntil } = candidate;
        if (!validFrom || !validUntil)
            return;
        if (validFrom > validUntil) {
            add({
                level: 'error',
                code: 'INVALID_DATE_RANGE',
                message: `validFrom (${validFrom}) must be on or before validUntil (${validUntil}).`,
            });
        }
    }
    // ── 6. Conflict detection ─────────────────────────────────────────────────
    async detectConflicts(candidate, tenantId, excludeId, add) {
        const { ruleType, scope } = candidate;
        if (!ruleType)
            return;
        // Fetch all active rules of the same type for this tenant
        const existingRules = await this.pricingRuleRepository.findAll(tenantId, false);
        const peers = existingRules.filter((r) => {
            if (excludeId && r.id === excludeId)
                return false; // skip self on update
            return r.ruleType === ruleType;
        });
        for (const peer of peers) {
            if (!this.scopesCouldOverlap(candidate, peer))
                continue;
            if (!this.dateRangesOverlap(candidate, peer))
                continue;
            if (!this.timeWindowsOverlap(candidate, peer))
                continue;
            if (!this.daysOfWeekOverlap(candidate, peer))
                continue;
            // Two BASE rules with overlapping applicability — only one can win
            if (ruleType === 'base') {
                add({
                    level: 'error',
                    code: 'DUPLICATE_BASE_RULE',
                    message: `This BASE rule conflicts with existing rule "${peer.name}" ` +
                        `(priority ${peer.priority}). Only one base rate can apply ` +
                        `to the same scope+time window. ` +
                        `Adjust the scope, date range, time window, or days-of-week to avoid overlap, ` +
                        `or set a higher priority to explicitly override it.`,
                    conflictingRuleId: peer.id,
                    conflictingRuleName: peer.name,
                });
                continue;
            }
            // Two ABSOLUTE custom rules — both would try to set the final price
            if (ruleType === 'custom' &&
                candidate.modifierType === 'absolute' &&
                peer.modifierType === 'absolute') {
                add({
                    level: 'error',
                    code: 'DUPLICATE_ABSOLUTE_OVERRIDE',
                    message: `This absolute-price CUSTOM rule conflicts with "${peer.name}". ` +
                        `Two absolute overrides cannot apply to the same slot — ` +
                        `only the highest-priority one fires. ` +
                        `Use the priority field to establish a clear winner, ` +
                        `or narrow the scope/time window of one rule.`,
                    conflictingRuleId: peer.id,
                    conflictingRuleName: peer.name,
                });
                continue;
            }
            // Same priority, same type — ambiguous ordering (warning only)
            const candidatePriority = candidate.priority ?? 0;
            if (peer.priority === candidatePriority && ruleType !== 'base') {
                add({
                    level: 'warning',
                    code: 'PRIORITY_COLLISION',
                    message: `Rule "${peer.name}" has the same priority (${peer.priority}) ` +
                        `and ruleType ("${ruleType}") and may apply to the same slots. ` +
                        `When priorities are equal, the rule created first takes precedence. ` +
                        `Consider setting explicit priorities to make evaluation deterministic.`,
                    conflictingRuleId: peer.id,
                    conflictingRuleName: peer.name,
                });
            }
        }
    }
    // ── Overlap helpers ───────────────────────────────────────────────────────
    /**
     * Returns true if the two rules could apply to the same slot
     * based on their scope and scope FKs.
     */
    scopesCouldOverlap(a, b) {
        // tenant-scoped rules overlap with everything
        if (a.scope === 'tenant' || b.scope === 'tenant')
            return true;
        // same scope type + same FK
        if (a.scope === b.scope) {
            if (a.scope === 'branch')
                return a.branchId === b.branchId;
            if (a.scope === 'sport')
                return a.sportId === b.sportId;
            if (a.scope === 'court')
                return a.courtId === b.courtId;
        }
        // branch + court: court rule overrides but could overlap semantically
        if (a.scope === 'branch' && b.scope === 'court' && b.branchId === a.branchId)
            return true;
        if (a.scope === 'court' && b.scope === 'branch' && a.branchId === b.branchId)
            return true;
        return false;
    }
    /** Returns true if the two date ranges overlap (open-ended = infinite). */
    dateRangesOverlap(a, b) {
        const aFrom = a.validFrom ?? '0001-01-01';
        const aUntil = a.validUntil ?? '9999-12-31';
        const bFrom = b.validFrom ?? '0001-01-01';
        const bUntil = b.validUntil ?? '9999-12-31';
        return aFrom <= bUntil && aUntil >= bFrom;
    }
    /** Returns true if the two time windows overlap (null = all day). */
    timeWindowsOverlap(a, b) {
        const aStart = a.timeStart ?? '00:00';
        const aEnd = a.timeEnd ?? '24:00';
        const bStart = b.timeStart ?? '00:00';
        const bEnd = b.timeEnd ?? '24:00';
        return aStart < bEnd && aEnd > bStart;
    }
    /** Returns true if the two day-of-week sets share any day. */
    daysOfWeekOverlap(a, b) {
        const ALL_DAYS = new Set([
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        ]);
        const aDays = !a.daysOfWeek || a.daysOfWeek.length === 0 ? ALL_DAYS : new Set(a.daysOfWeek);
        const bDays = !b.daysOfWeek || b.daysOfWeek.length === 0 ? ALL_DAYS : new Set(b.daysOfWeek);
        for (const day of aDays) {
            if (bDays.has(day))
                return true;
        }
        return false;
    }
};
exports.PricingRuleValidationService = PricingRuleValidationService;
exports.PricingRuleValidationService = PricingRuleValidationService = PricingRuleValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pricing_rule_repository_1.PricingRuleRepository])
], PricingRuleValidationService);
//# sourceMappingURL=pricing-rule-validation.service.js.map
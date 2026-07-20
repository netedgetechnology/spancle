/**
 * revenue-distribution.aggregate.ts
 *
 * RevenueDistribution — Finance domain aggregate representing how received
 * funds are allocated among business parties (coach, academy, platform, etc.).
 *
 * A RevenueDistribution:
 *   - References a Settlement (by ID only — no entity import).
 *   - Holds one or more DistributionAllocation value objects.
 *   - Enforces the balance invariant: ∑ amountMinor of allocations = sourceAmountMinor.
 *   - Does NOT post ledger entries.
 *   - Does NOT call payment gateways.
 *   - Does NOT persist anything directly.
 *
 * Lifecycle:
 *   DRAFT      — allocations being assembled; not yet validated
 *   CALCULATED — allocations validated and balance confirmed
 *   DISTRIBUTED— funds dispatched; immutable
 *   CANCELLED  — terminal; no further changes
 *
 * Transitions:
 *   DRAFT → CALCULATED → DISTRIBUTED
 *   DRAFT → CANCELLED
 *   CALCULATED → CANCELLED
 *   DISTRIBUTED → (terminal)
 *   CANCELLED   → (terminal)
 */
import { DistributionAllocation } from './distribution-allocation.value-object';
import type { Settlement }         from '../../settlement/domain/settlement.aggregate';

// ── IRevenueDistributionRule ──────────────────────────────────────────────────

/**
 * Strategy interface for distribution rule implementations.
 *
 * Rules calculate the allocations given a settlement.
 * No implementation here — infrastructure provides rules (DB-loaded policies,
 * fixed-percentage configs, tiered structures, etc.).
 */
export interface IRevenueDistributionRule {
  /**
   * Calculates the allocation set for a given settled amount.
   * Pure function — no side effects, no DB access.
   *
   * @param settlement  The fully settled Settlement aggregate.
   * @returns           Array of DistributionAllocation value objects that
   *                    must balance (∑ amountMinor === settlement.settledAmountMinor).
   */
  calculate(settlement: Settlement): DistributionAllocation[];
}

export const REVENUE_DISTRIBUTION_RULE = Symbol('IRevenueDistributionRule');

// ── RevenueDistributionStatus ─────────────────────────────────────────────────

export type RevenueDistributionStatus =
  | 'DRAFT'
  | 'CALCULATED'
  | 'DISTRIBUTED'
  | 'CANCELLED';

const ALLOWED: Record<RevenueDistributionStatus, RevenueDistributionStatus[]> = {
  DRAFT:       ['CALCULATED', 'CANCELLED'],
  CALCULATED:  ['DISTRIBUTED', 'CANCELLED'],
  DISTRIBUTED: [],
  CANCELLED:   [],
};

// ── RevenueDistributionProps ──────────────────────────────────────────────────

export interface RevenueDistributionProps {
  readonly distributionId:    string;
  readonly tenantId:          string;
  readonly settlementId:      string;
  readonly sourceAmountMinor: number;
  readonly currency:          string;
  readonly status:            RevenueDistributionStatus;
  readonly notes:             string | null;
  readonly version:           number;
  readonly createdAt:         string;
  readonly updatedAt:         string;
}

// ── RevenueDistribution aggregate ────────────────────────────────────────────

export class RevenueDistribution {
  private readonly _props:         Readonly<RevenueDistributionProps>;
  private readonly _allocations:   DistributionAllocation[];

  private constructor(
    props:       RevenueDistributionProps,
    allocations: DistributionAllocation[],
  ) {
    RevenueDistribution.validateProps(props);
    this._props       = Object.freeze({ ...props });
    this._allocations = allocations;
  }

  // ── Factories ──────────────────────────────────────────────────────────────

  static createDraft(
    props: Omit<RevenueDistributionProps, 'status' | 'version' | 'createdAt' | 'updatedAt'>,
  ): RevenueDistribution {
    const now = new Date().toISOString();
    return new RevenueDistribution(
      { ...props, status: 'DRAFT', version: 1, createdAt: now, updatedAt: now },
      [],
    );
  }

  static reconstitute(
    props:       RevenueDistributionProps,
    allocations: DistributionAllocation[],
  ): RevenueDistribution {
    return new RevenueDistribution(props, allocations);
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  get distributionId():    string                     { return this._props.distributionId; }
  get tenantId():          string                     { return this._props.tenantId; }
  get settlementId():      string                     { return this._props.settlementId; }
  get sourceAmountMinor(): number                     { return this._props.sourceAmountMinor; }
  get currency():          string                     { return this._props.currency; }
  get status():            RevenueDistributionStatus  { return this._props.status; }
  get notes():             string | null              { return this._props.notes; }
  get version():           number                     { return this._props.version; }
  get createdAt():         string                     { return this._props.createdAt; }
  get updatedAt():         string                     { return this._props.updatedAt; }
  get allocations():       ReadonlyArray<DistributionAllocation> { return this._allocations; }

  get isDraft():       boolean { return this._props.status === 'DRAFT'; }
  get isCalculated():  boolean { return this._props.status === 'CALCULATED'; }
  get isDistributed(): boolean { return this._props.status === 'DISTRIBUTED'; }
  get isCancelled():   boolean { return this._props.status === 'CANCELLED'; }
  get isTerminal():    boolean {
    return this._props.status === 'DISTRIBUTED' || this._props.status === 'CANCELLED';
  }

  /** Sum of all allocation amounts. */
  get totalAllocatedMinor(): number {
    return this._allocations.reduce((s, a) => s + a.amountMinor, 0);
  }

  /** Unallocated remainder. Must be 0 before calculate() transitions succeed. */
  get unallocatedMinor(): number {
    return this._props.sourceAmountMinor - this.totalAllocatedMinor;
  }

  /** True when allocations sum exactly to sourceAmountMinor. */
  get isBalanced(): boolean {
    return this.totalAllocatedMinor === this._props.sourceAmountMinor;
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  /**
   * Adds an allocation to a DRAFT distribution. Returns new instance.
   *
   * Rules:
   *   - Only DRAFT distributions accept new allocations.
   *   - Cumulative total must not exceed sourceAmountMinor after addition.
   *   - Negative amountMinor is prohibited (enforced by DistributionAllocation).
   */
  addAllocation(allocation: DistributionAllocation): RevenueDistribution {
    this.assertDraft('addAllocation');
    if (allocation.currency !== this._props.currency) {
      throw new Error(
        `RevenueDistribution.addAllocation: currency mismatch — ` +
        `distribution is ${this._props.currency}, allocation is ${allocation.currency}`,
      );
    }
    const newTotal = this.totalAllocatedMinor + allocation.amountMinor;
    if (newTotal > this._props.sourceAmountMinor) {
      throw new Error(
        `RevenueDistribution.addAllocation: over-allocation — ` +
        `adding ${allocation.amountMinor} would total ${newTotal} ` +
        `against source ${this._props.sourceAmountMinor}`,
      );
    }
    return this.next(this._props, [...this._allocations, allocation]);
  }

  /**
   * Removes an allocation by allocationId from a DRAFT distribution.
   * Returns new instance.
   */
  removeAllocation(allocationId: string): RevenueDistribution {
    this.assertDraft('removeAllocation');
    const filtered = this._allocations.filter((a) => a.allocationId !== allocationId);
    if (filtered.length === this._allocations.length) {
      throw new Error(`RevenueDistribution.removeAllocation: "${allocationId}" not found`);
    }
    return this.next(this._props, filtered);
  }

  /**
   * Transitions DRAFT → CALCULATED after verifying balance.
   * Returns new instance.
   */
  calculate(): RevenueDistribution {
    this.assertTransition('CALCULATED');
    if (this._allocations.length === 0) {
      throw new Error('RevenueDistribution.calculate: no allocations to calculate');
    }
    if (!this.isBalanced) {
      throw new Error(
        `RevenueDistribution.calculate: not balanced — ` +
        `allocated=${this.totalAllocatedMinor} source=${this._props.sourceAmountMinor} ` +
        `unallocated=${this.unallocatedMinor}`,
      );
    }
    return this.next({ ...this._props, status: 'CALCULATED' }, [...this._allocations]);
  }

  /**
   * Transitions CALCULATED → DISTRIBUTED.
   * Once distributed, the aggregate is immutable.
   */
  complete(): RevenueDistribution {
    this.assertTransition('DISTRIBUTED');
    return this.next({ ...this._props, status: 'DISTRIBUTED' }, [...this._allocations]);
  }

  /**
   * Cancels the distribution from DRAFT or CALCULATED.
   * DISTRIBUTED distributions cannot be cancelled.
   */
  cancel(reason?: string): RevenueDistribution {
    this.assertTransition('CANCELLED');
    return this.next({
      ...this._props,
      status: 'CANCELLED',
      notes: reason
        ? `${this._props.notes ?? ''} [CANCELLED: ${reason}]`.trim()
        : this._props.notes,
    }, [...this._allocations]);
  }

  /** Updates notes on non-terminal distributions. */
  updateNotes(notes: string): RevenueDistribution {
    if (this.isTerminal) {
      throw new Error(`RevenueDistribution.updateNotes: cannot modify ${this._props.status}`);
    }
    return this.next({ ...this._props, notes }, [...this._allocations]);
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      ...this._props,
      allocations:         this._allocations.map((a) => a.toJSON()),
      totalAllocatedMinor: this.totalAllocatedMinor,
      unallocatedMinor:    this.unallocatedMinor,
      isBalanced:          this.isBalanced,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private next(props: RevenueDistributionProps, allocations: DistributionAllocation[]): RevenueDistribution {
    return new RevenueDistribution(
      { ...props, version: props.version + 1, updatedAt: new Date().toISOString() },
      allocations,
    );
  }

  private assertDraft(op: string): void {
    if (!this.isDraft) {
      throw new Error(`RevenueDistribution.${op}: only DRAFT distributions can be modified; current=${this._props.status}`);
    }
  }

  private assertTransition(to: RevenueDistributionStatus): void {
    const allowed = ALLOWED[this._props.status];
    if (!allowed.includes(to)) {
      throw new Error(`RevenueDistribution: illegal transition ${this._props.status} → ${to}`);
    }
  }

  private static validateProps(p: RevenueDistributionProps): void {
    if (!p.distributionId) throw new Error('RevenueDistribution: distributionId required');
    if (!p.tenantId)       throw new Error('RevenueDistribution: tenantId required');
    if (!p.settlementId)   throw new Error('RevenueDistribution: settlementId required');
    if (!p.currency || p.currency.length !== 3)
      throw new Error(`RevenueDistribution: currency must be 3-char ISO-4217; got "${p.currency}"`);
    if (!Number.isInteger(p.sourceAmountMinor) || p.sourceAmountMinor <= 0)
      throw new Error(`RevenueDistribution: sourceAmountMinor must be a positive integer; got ${p.sourceAmountMinor}`);
  }
}

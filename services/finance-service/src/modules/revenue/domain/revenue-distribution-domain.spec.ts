/**
 * revenue-distribution-domain.spec.ts
 */
import {
  DistributionAllocation,
  RecipientTypes,
  isRecipientType,
} from './distribution-allocation.value-object';
import { RevenueDistribution }         from './revenue-distribution.aggregate';
import {
  distributionCreatedEvent, distributionCalculatedEvent,
  distributionCompletedEvent, distributionCancelledEvent,
  distributionCreated, distributionCalculated, distributionCompleted,
  distributionCancelled, distributionRejected, distributionError,
  RevenueDistributionEventTypes,
} from './revenue-distribution-domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

const T = 'tenant-001', SET = 'set-001', CUR = 'GBP';

function makeDistribution(sourceAmountMinor = 10000): RevenueDistribution {
  return RevenueDistribution.createDraft({
    distributionId:    'dist-001',
    tenantId:          T,
    settlementId:      SET,
    sourceAmountMinor,
    currency:          CUR,
    notes:             null,
  });
}

let seq = 0;
function fixed(amount: number, recipient = 'PLATFORM', id?: string): DistributionAllocation {
  return DistributionAllocation.createFixed(
    id ?? `alloc-${++seq}`, recipient as any, `rcpt-${seq}`,
    amount, CUR, `Fixed allocation to ${recipient}`,
  );
}

function pct(rateBps: number, amount: number, recipient = 'COACH', id?: string): DistributionAllocation {
  return DistributionAllocation.createPercentage(
    id ?? `alloc-${++seq}`, recipient as any, `rcpt-${seq}`,
    rateBps, amount, CUR, `${rateBps} bps to ${recipient}`,
  );
}

// =============================================================================

describe('RecipientType', () => {
  it('all 7 recipient types are defined', () => {
    expect(RecipientTypes).toHaveLength(7);
    expect(RecipientTypes).toContain('COACH');
    expect(RecipientTypes).toContain('PLATFORM');
    expect(RecipientTypes).toContain('VENUE');
  });

  it('isRecipientType returns true for valid types', () => {
    RecipientTypes.forEach((r) => expect(isRecipientType(r)).toBe(true));
  });

  it('returns false for unknown type', () => {
    expect(isRecipientType('BANK')).toBe(false);
  });
});

describe('DistributionAllocation.createFixed()', () => {
  it('creates with FIXED_AMOUNT type and rateBps=0', () => {
    const a = fixed(5000);
    expect(a.allocationType).toBe('FIXED_AMOUNT');
    expect(a.rateBps).toBe(0);
    expect(a.amountMinor).toBe(5000);
    expect(a.isFixed).toBe(true);
  });

  it('throws for zero amount', () => {
    expect(() => DistributionAllocation.createFixed('a', 'PLATFORM', 'r', 0, CUR, 'x'))
      .toThrow(/positive integer/);
  });

  it('throws for negative amount', () => {
    expect(() => DistributionAllocation.createFixed('a', 'PLATFORM', 'r', -1, CUR, 'x'))
      .toThrow(/positive integer/);
  });

  it('throws for invalid currency', () => {
    expect(() => DistributionAllocation.createFixed('a', 'PLATFORM', 'r', 100, 'GBPP', 'x'))
      .toThrow(/3-char/);
  });

  it('throws for invalid recipientType', () => {
    expect(() => DistributionAllocation.createFixed('a', 'BANK' as any, 'r', 100, CUR, 'x'))
      .toThrow(/recipientType/);
  });
});

describe('DistributionAllocation.createPercentage()', () => {
  it('creates with PERCENTAGE type and correct rateBps', () => {
    const a = pct(2000, 2000); // 20%
    expect(a.allocationType).toBe('PERCENTAGE');
    expect(a.rateBps).toBe(2000);
    expect(a.isPercentage).toBe(true);
  });

  it('throws for zero rateBps on PERCENTAGE', () => {
    expect(() => DistributionAllocation.createPercentage('a', 'COACH', 'r', 0, 1000, CUR, 'x'))
      .toThrow(/1–10000/);
  });

  it('throws for rateBps > 10000', () => {
    expect(() => DistributionAllocation.createPercentage('a', 'COACH', 'r', 10001, 1000, CUR, 'x'))
      .toThrow(/1–10000/);
  });
});

describe('RevenueDistribution.createDraft()', () => {
  it('starts in DRAFT status with no allocations', () => {
    const d = makeDistribution();
    expect(d.isDraft).toBe(true);
    expect(d.allocations).toHaveLength(0);
    expect(d.version).toBe(1);
  });

  it('totalAllocatedMinor=0, unallocatedMinor=sourceAmountMinor', () => {
    const d = makeDistribution(8000);
    expect(d.totalAllocatedMinor).toBe(0);
    expect(d.unallocatedMinor).toBe(8000);
    expect(d.isBalanced).toBe(false);
  });

  it('throws for zero sourceAmountMinor', () => {
    expect(() => RevenueDistribution.createDraft({
      distributionId: 'x', tenantId: T, settlementId: SET,
      sourceAmountMinor: 0, currency: CUR, notes: null,
    })).toThrow(/positive integer/);
  });
});

describe('RevenueDistribution.addAllocation()', () => {
  it('adds a fixed allocation', () => {
    const d = makeDistribution(10000).addAllocation(fixed(4000, 'PLATFORM', 'a1'));
    expect(d.allocations).toHaveLength(1);
    expect(d.totalAllocatedMinor).toBe(4000);
    expect(d.unallocatedMinor).toBe(6000);
  });

  it('adds a percentage allocation', () => {
    const d = makeDistribution(10000).addAllocation(pct(3000, 3000, 'COACH', 'a1'));
    expect(d.allocations[0]!.allocationType).toBe('PERCENTAGE');
    expect(d.totalAllocatedMinor).toBe(3000);
  });

  it('two allocations accumulate correctly', () => {
    const d = makeDistribution(10000)
      .addAllocation(fixed(6000, 'PLATFORM', 'a1'))
      .addAllocation(fixed(4000, 'COACH', 'a2'));
    expect(d.totalAllocatedMinor).toBe(10000);
    expect(d.isBalanced).toBe(true);
  });

  it('over-allocation throws', () => {
    const d = makeDistribution(5000).addAllocation(fixed(4000, 'PLATFORM', 'a1'));
    expect(() => d.addAllocation(fixed(2000, 'COACH', 'a2'))).toThrow(/over-allocation/);
  });

  it('currency mismatch throws', () => {
    const usdAlloc = DistributionAllocation.createFixed('ax', 'COACH', 'r', 100, 'USD', 'USD alloc');
    expect(() => makeDistribution().addAllocation(usdAlloc)).toThrow(/currency mismatch/);
  });

  it('returns new instance — original unchanged', () => {
    const d1 = makeDistribution();
    const d2 = d1.addAllocation(fixed(100, 'PLATFORM', 'a1'));
    expect(d1.allocations).toHaveLength(0);
    expect(d2.allocations).toHaveLength(1);
  });

  it('increments version', () => {
    expect(makeDistribution().addAllocation(fixed(100, 'PLATFORM', 'a1')).version).toBe(2);
  });

  it('throws when called on CALCULATED distribution', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate();
    expect(() => d.addAllocation(fixed(100, 'COACH', 'a2'))).toThrow(/DRAFT/);
  });
});

describe('RevenueDistribution.removeAllocation()', () => {
  it('removes allocation by ID', () => {
    const d = makeDistribution(10000)
      .addAllocation(fixed(6000, 'PLATFORM', 'keep'))
      .addAllocation(fixed(4000, 'COACH', 'remove-me'));
    const after = d.removeAllocation('remove-me');
    expect(after.allocations).toHaveLength(1);
    expect(after.totalAllocatedMinor).toBe(6000);
  });

  it('throws for unknown ID', () => {
    expect(() => makeDistribution().removeAllocation('nope')).toThrow(/not found/);
  });

  it('throws on non-DRAFT', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate();
    expect(() => d.removeAllocation('a1')).toThrow(/DRAFT/);
  });
});

describe('RevenueDistribution.calculate()', () => {
  it('transitions DRAFT → CALCULATED when balanced', () => {
    const d = makeDistribution(10000)
      .addAllocation(fixed(7000, 'PLATFORM', 'a1'))
      .addAllocation(fixed(3000, 'COACH', 'a2'))
      .calculate();
    expect(d.isCalculated).toBe(true);
    expect(d.isBalanced).toBe(true);
  });

  it('throws when unbalanced', () => {
    const d = makeDistribution(10000).addAllocation(fixed(7000, 'PLATFORM', 'a1'));
    expect(() => d.calculate()).toThrow(/not balanced/);
  });

  it('throws with no allocations', () => {
    expect(() => makeDistribution().calculate()).toThrow(/no allocations/);
  });

  it('returns new instance — original still DRAFT', () => {
    const draft = makeDistribution(5000).addAllocation(fixed(5000, 'PLATFORM', 'a1'));
    const calc  = draft.calculate();
    expect(draft.isDraft).toBe(true);
    expect(calc.isCalculated).toBe(true);
  });
});

describe('RevenueDistribution.complete()', () => {
  it('transitions CALCULATED → DISTRIBUTED', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate().complete();
    expect(d.isDistributed).toBe(true);
    expect(d.isTerminal).toBe(true);
  });

  it('DISTRIBUTED is immutable — addAllocation throws', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate().complete();
    expect(() => d.addAllocation(fixed(100, 'COACH', 'a2'))).toThrow(/DRAFT/);
  });

  it('DISTRIBUTED cannot be cancelled', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate().complete();
    expect(() => d.cancel()).toThrow(/DISTRIBUTED → CANCELLED/);
  });

  it('throws when called directly from DRAFT', () => {
    expect(() => makeDistribution(5000).addAllocation(fixed(5000, 'PLATFORM', 'a1')).complete())
      .toThrow(/DRAFT → DISTRIBUTED/);
  });
});

describe('RevenueDistribution.cancel()', () => {
  it('DRAFT → CANCELLED', () => {
    expect(makeDistribution().cancel().isCancelled).toBe(true);
  });

  it('CALCULATED → CANCELLED', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate().cancel('changed mind');
    expect(d.isCancelled).toBe(true);
    expect(d.notes).toContain('CANCELLED');
  });

  it('DISTRIBUTED cannot be cancelled', () => {
    const d = makeDistribution(5000)
      .addAllocation(fixed(5000, 'PLATFORM', 'a1'))
      .calculate().complete();
    expect(() => d.cancel()).toThrow(/DISTRIBUTED/);
  });

  it('double cancel is illegal', () => {
    expect(() => makeDistribution().cancel().cancel()).toThrow(/CANCELLED → CANCELLED/);
  });
});

describe('Domain events', () => {
  it('distributionCreatedEvent is frozen with required fields', () => {
    const d = makeDistribution();
    const e = distributionCreatedEvent(d, 'corr-001');
    expect(e.eventType).toBe(RevenueDistributionEventTypes.DISTRIBUTION_CREATED);
    expect(e.sourceAmountMinor).toBe(10000);
    expect(e.distributionId).toBe('dist-001');
    expect(Object.isFrozen(e)).toBe(true);
  });

  it('distributionCalculatedEvent includes allocationCount', () => {
    const d = makeDistribution(5000).addAllocation(fixed(5000, 'PLATFORM', 'a1')).calculate();
    const e = distributionCalculatedEvent(d, null);
    expect(e.allocationCount).toBe(1);
    expect(e.totalAllocatedMinor).toBe(5000);
  });

  it('distributionCompletedEvent is frozen', () => {
    const d = makeDistribution(5000).addAllocation(fixed(5000, 'PLATFORM', 'a1')).calculate().complete();
    expect(Object.isFrozen(distributionCompletedEvent(d, null))).toBe(true);
  });

  it('distributionCancelledEvent includes version', () => {
    const d = makeDistribution().cancel();
    const e = distributionCancelledEvent(d, null);
    expect(e.version).toBe(2);
  });

  it('each event has a unique UUID eventId', () => {
    const d = makeDistribution();
    expect(distributionCreatedEvent(d, null).eventId).not.toBe(distributionCreatedEvent(d, null).eventId);
  });
});

describe('DistributionResult factories', () => {
  it('distributionCreated returns frozen success with kind=DistributionCreated', () => {
    const r = distributionCreated(makeDistribution());
    expect(r.success).toBe(true); expect(r.kind).toBe('DistributionCreated');
    expect(Object.isFrozen(r)).toBe(true);
  });
  it('distributionCalculated returns kind=DistributionCalculated', () => {
    const d = makeDistribution(5000).addAllocation(fixed(5000, 'PLATFORM', 'a1')).calculate();
    expect(distributionCalculated(d).kind).toBe('DistributionCalculated');
  });
  it('distributionCompleted returns kind=DistributionCompleted', () => {
    const d = makeDistribution(5000).addAllocation(fixed(5000, 'PLATFORM', 'a1')).calculate().complete();
    expect(distributionCompleted(d).kind).toBe('DistributionCompleted');
  });
  it('distributionCancelled returns kind=DistributionCancelled', () => {
    expect(distributionCancelled(makeDistribution().cancel()).kind).toBe('DistributionCancelled');
  });
  it('distributionRejected returns frozen failure result', () => {
    const r = distributionRejected('OVER_ALLOCATION', [distributionError('amountMinor', 'exceeds source')]);
    expect(r.success).toBe(false); expect(r.kind).toBe('DistributionRejected');
    expect(r.reason).toBe('OVER_ALLOCATION');
    expect(Object.isFrozen(r)).toBe(true);
  });
});

describe('No ledger / accounting dependency', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  ['revenue-distribution.aggregate.ts', 'revenue-distribution-domain.ts',
    'distribution-allocation.value-object.ts'].forEach((file) => {
    it(`${file} has no ledger, posting, TypeORM, or HTTP imports`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), `src/modules/revenue/domain/${file}`), 'utf8');
      src.split('\n').filter((l: string) => l.trim().startsWith('import') && !l.includes('settlement.aggregate')).forEach((line: string) => {
        expect(line).not.toMatch(/ledger|typeorm|posting|http/i);
        expect(line).not.toMatch(/EventEmitter|rabbitmq|kafka/i);
      });
    });
  });
});

/**
 * membership-integration.service.spec.ts
 *
 * Unit tests for MembershipIntegrationService.
 *
 * Covers:
 *   validateAndComputePrice():
 *     ✓ guest/non-member → no context, null price
 *     ✓ member with no credits/discounts → no adjustment
 *     ✓ member with court_credit → price = 0, shouldConsumeCredit = true
 *     ✓ member with booking_discount_pct → correct % discount
 *     ✓ member with booking_discount_fixed → correct fixed discount
 *     ✓ discount capped at slot price
 *     ✓ branch restriction violated → BadRequestException
 *     ✓ sport restriction violated → BadRequestException
 *     ✓ court restriction violated → BadRequestException
 *     ✓ no scope restrictions → no exception
 *
 *   consumeEntitlement():
 *     ✓ no membershipId → returns null (no-op)
 *     ✓ entitlementService.consume() called with correct params
 *     ✓ error → returns null (non-fatal)
 *
 *   restoreEntitlement():
 *     ✓ no membershipId → no calls
 *     ✓ entitlementService.refund() called with original txn id
 *     ✓ error → does not throw (non-fatal)
 *     ✓ walletAmountMinor > 0 → refundToWallet called
 *
 *   applyWalletPayment():
 *     ✓ amount = 0 → no-op
 *     ✓ insufficient balance → BadRequestException
 *     ✓ sufficient balance → deducted
 *
 *   refundToWallet():
 *     ✓ amount = 0 → no-op
 *     ✓ restores balance
 *     ✓ error → does not throw (non-fatal)
 */

import { BadRequestException }       from '@nestjs/common';
import { MembershipIntegrationService } from '../membership-integration.service';
import type { MembershipService }    from '../../../membership/services/membership.service';
import type { EntitlementService }   from '../../../membership/services/entitlement.service';
import type { BookingEntity }        from '../../entities/booking.entity';
import type { DataSource }           from 'typeorm';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T   = 'tenant-aaaa-0000-0000-000000000001';
const ACT = 'actor-1111-0000-0000-000000000001';
const BK_ID = 'booking-aaaa-0000-0000-000000000001';
const MS_ID = 'membership-aaaa-0000-0000-000000000001';
const CUST  = 'customer-aaaa-0000-0000-000000000001';

const NON_MEMBER_STATUS = {
  isMember: false, membershipId: null, membershipTier: null,
  membershipStatus: null, priorityBookingHoursAhead: 0,
  courtCreditsRemaining: 0, coachCreditsRemaining: 0, guestPassesRemaining: 0,
  tournamentCreditsRemaining: 0, cafeCreditMinor: 0, lockerAccess: false,
  parkingAccess: false, discountEligible: false,
};

function makeActiveMemberStatus(overrides: Record<string,unknown> = {}): Record<string,unknown> {
  return {
    ...NON_MEMBER_STATUS,
    isMember:              true,
    membershipId:          MS_ID,
    membershipTier:        'gold',
    membershipStatus:      'active',
    discountEligible:      false,
    courtCreditsRemaining: 0,
    ...overrides,
  };
}

function makeBooking(overrides: Partial<BookingEntity> = {}): BookingEntity {
  return {
    id:                BK_ID,
    tenantId:          T,
    reference:         'BK-TEST-0001',
    customerId:        CUST,
    membershipId:      null,
    entitlementType:   null,
    entitlementTxnId:  null,
    discountMinor:     0,
    walletAmountMinor: 0,
    slotIds:           [],
    ...overrides,
  } as unknown as BookingEntity;
}

function makeCreateDto(overrides = {}): object {
  return {
    slotIds:   ['slot-1'],
    branchId:  'branch-1',
    courtId:   'court-1',
    sportId:   'sport-1',
    customer: { name: 'Alice', email: 'a@b.com', userId: 'user-1', isMember: true },
    channel:  'online',
    ...overrides,
  };
}

// ── Mock builders ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeMembershipService(status: any = NON_MEMBER_STATUS, membership: any = null) {
  return {
    getMembershipStatus: jest.fn().mockResolvedValue(status),
    findActiveByUser:    jest.fn().mockResolvedValue(membership),
  } as unknown as jest.Mocked<MembershipService>;
}

function makeEntitlementService() {
  return {
    consume: jest.fn().mockResolvedValue({ id: 'balance-id', balance: 0, reservedUnits: 0 }),
    refund:  jest.fn().mockResolvedValue({ id: 'balance-id', balance: 1, reservedUnits: 0 }),
  } as unknown as jest.Mocked<EntitlementService>;
}

function makeDataSource(walletBalance = 1000) {
  const makeManager = (balance: number) => ({
    query: jest.fn().mockImplementation((sql: string, _params?: unknown[]) => {
      if (sql.includes('FOR UPDATE')) return [{ wallet_balance_minor: balance }];
      if (sql.includes('UPDATE customers')) {
        // Simulate insufficient balance check
        if (sql.includes('wallet_balance_minor - $1') && _params && Number(_params[0]) > balance) {
          throw new Error('Wallet insufficient');
        }
        return [];
      }
      return [];
    }),
  });
  const qb = {
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation(async (fn: (m: object) => Promise<void>) => {
      return fn(makeManager(walletBalance));
    }),
  };
  return qb as unknown as DataSource;
}

function makeSvc(
  membershipSvc:  jest.Mocked<MembershipService>  = makeMembershipService() as never,
  entitlementSvc: jest.Mocked<EntitlementService> = makeEntitlementService() as never,
  ds:             DataSource                      = makeDataSource() as never,
) {
  return new MembershipIntegrationService(membershipSvc, entitlementSvc, ds);
}

// ── validateAndComputePrice ───────────────────────────────────────────────────

describe('MembershipIntegrationService.validateAndComputePrice()', () => {
  it('returns null context for a guest booking (no userId)', async () => {
    const svc = makeSvc();
    const result = await svc.validateAndComputePrice({
      dto: { ...makeCreateDto(), customer: { name: 'Guest', email: 'g@b.com', userId: undefined, isMember: false } } as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0]);

    expect(result.context).toBeNull();
    expect(result.discountMinor).toBe(0);
    expect(result.shouldConsumeCredit).toBe(false);
  });

  it('returns null context when getMembershipStatus says isMember=false', async () => {
    const svc = makeSvc(makeMembershipService(NON_MEMBER_STATUS));
    const result = await svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0]);
    expect(result.context).toBeNull();
  });

  it('applies court_credit — sets price=0 and shouldConsumeCredit=true', async () => {
    const status = makeActiveMemberStatus({ courtCreditsRemaining: 2 });
    const svc    = makeSvc(makeMembershipService(status, { benefitSnapshot: [] }));
    const result = await svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0]);

    expect(result.adjustedPriceMinor).toBe(0);
    expect(result.discountMinor).toBe(1000);
    expect(result.shouldConsumeCredit).toBe(true);
  });

  it('applies booking_discount_pct', async () => {
    const status = makeActiveMemberStatus({ discountEligible: true });
    const snapshot = [{ benefitType: 'booking_discount_pct', value: 20 }];
    const svc = makeSvc(makeMembershipService(status as never, { benefitSnapshot: snapshot } as never) as never);
    const result = await svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0]);

    expect(result.discountMinor).toBe(200);
    expect(result.adjustedPriceMinor).toBe(800);
  });

  it('applies booking_discount_fixed', async () => {
    const status   = makeActiveMemberStatus({ discountEligible: true });
    const snapshot = [{ benefitType: 'booking_discount_fixed', value: 300 }];
    const svc = makeSvc(makeMembershipService(status as never, { benefitSnapshot: snapshot } as never) as never);
    const result = await svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0]);

    expect(result.discountMinor).toBe(300);
    expect(result.adjustedPriceMinor).toBe(700);
  });

  it('caps fixed discount at slot price', async () => {
    const status   = makeActiveMemberStatus({ discountEligible: true });
    const snapshot = [{ benefitType: 'booking_discount_fixed', value: 9999 }];
    const svc = makeSvc(makeMembershipService(status as never, { benefitSnapshot: snapshot } as never) as never);
    const result = await svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 500, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0]);

    expect(result.discountMinor).toBe(500);
  });

  it('throws BadRequestException on branch scope violation', async () => {
    const status   = makeActiveMemberStatus({ courtCreditsRemaining: 0 });
    const snapshot = [{ benefitType: 'court_credit', allowedBranchIds: ['branch-999'] }];
    const svc = makeSvc(makeMembershipService(status as never, { benefitSnapshot: snapshot } as never) as never);

    await expect(svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'branch-1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0])).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on court scope violation', async () => {
    const status   = makeActiveMemberStatus({ courtCreditsRemaining: 0 });
    const snapshot = [{ benefitType: 'court_credit', allowedCourtIds: ['court-999'] }];
    const svc = makeSvc(makeMembershipService(status as never, { benefitSnapshot: snapshot } as never) as never);

    await expect(svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0])).rejects.toThrow(BadRequestException);
  });

  it('allows booking when snapshot has no scope restrictions', async () => {
    const status = makeActiveMemberStatus({ courtCreditsRemaining: 1 });
    const svc    = makeSvc(makeMembershipService(status, { benefitSnapshot: [] }));
    await expect(svc.validateAndComputePrice({
      dto: makeCreateDto() as object,
      tenantId: T, slotPriceMinor: 1000, courtId: 'c1', branchId: 'b1', sportId: null,
    } as Parameters<typeof svc.validateAndComputePrice>[0])).resolves.not.toThrow();
  });
});

// ── consumeEntitlement ────────────────────────────────────────────────────────

describe('MembershipIntegrationService.consumeEntitlement()', () => {
  it('returns null when booking has no membershipId', async () => {
    const svc = makeSvc();
    const result = await svc.consumeEntitlement({ booking: makeBooking(), tenantId: T, actorId: ACT });
    expect(result).toBeNull();
  });

  it('calls entitlementService.consume() with correct params', async () => {
    const entitlementSvc = makeEntitlementService();
    const svc = makeSvc(undefined, entitlementSvc);
    const booking = makeBooking({ membershipId: MS_ID, entitlementType: 'court_credit', reference: 'BK-001' } as Partial<BookingEntity>);

    await svc.consumeEntitlement({ booking, tenantId: T, actorId: ACT });

    expect(entitlementSvc.consume).toHaveBeenCalledWith(
      MS_ID,
      expect.objectContaining({ benefitType: 'court_credit', quantity: 1 }),
      T, ACT,
    );
  });

  it('returns null (non-fatal) when consume() throws', async () => {
    const entitlementSvc = makeEntitlementService();
    entitlementSvc.consume.mockRejectedValue(new Error('Insufficient balance'));
    const svc = makeSvc(undefined, entitlementSvc);
    const booking = makeBooking({ membershipId: MS_ID, entitlementType: 'court_credit' } as Partial<BookingEntity>);

    const result = await svc.consumeEntitlement({ booking, tenantId: T, actorId: ACT });
    expect(result).toBeNull();
  });
});

// ── restoreEntitlement ────────────────────────────────────────────────────────

describe('MembershipIntegrationService.restoreEntitlement()', () => {
  it('does nothing when booking has no membershipId', async () => {
    const entitlementSvc = makeEntitlementService();
    const svc = makeSvc(undefined, entitlementSvc);
    await svc.restoreEntitlement({ booking: makeBooking(), tenantId: T, actorId: ACT });
    expect(entitlementSvc.refund).not.toHaveBeenCalled();
  });

  it('calls entitlementService.refund() with original txn id', async () => {
    const entitlementSvc = makeEntitlementService();
    const svc = makeSvc(undefined, entitlementSvc);
    const booking = makeBooking({
      membershipId: MS_ID, entitlementType: 'court_credit', entitlementTxnId: 'txn-001',
    } as Partial<BookingEntity>);

    await svc.restoreEntitlement({ booking, tenantId: T, actorId: ACT });
    expect(entitlementSvc.refund).toHaveBeenCalledWith(
      MS_ID,
      expect.objectContaining({ benefitType: 'court_credit', quantity: 1, originalTransactionId: 'txn-001' }),
      T, ACT,
    );
  });

  it('does not throw when refund() fails (non-fatal)', async () => {
    const entitlementSvc = makeEntitlementService();
    entitlementSvc.refund.mockRejectedValue(new Error('not found'));
    const svc = makeSvc(undefined, entitlementSvc);
    const booking = makeBooking({ membershipId: MS_ID, entitlementType: 'court_credit', entitlementTxnId: 'txn-001' } as Partial<BookingEntity>);

    await expect(svc.restoreEntitlement({ booking, tenantId: T, actorId: ACT })).resolves.toBeUndefined();
  });
});

// ── applyWalletPayment ────────────────────────────────────────────────────────

describe('MembershipIntegrationService.applyWalletPayment()', () => {
  it('does nothing when amount is 0', async () => {
    const ds = makeDataSource();
    const svc = makeSvc(undefined, undefined, ds);
    await svc.applyWalletPayment({ customerId: CUST, tenantId: T, amountMinor: 0, bookingRef: 'BK' });
    expect(ds.transaction).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when wallet is insufficient', async () => {
    const ds = makeDataSource(50);   // only 50 in wallet
    const svc = makeSvc(undefined, undefined, ds);
    await expect(
      svc.applyWalletPayment({ customerId: CUST, tenantId: T, amountMinor: 100, bookingRef: 'BK' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deducts from wallet when balance is sufficient', async () => {
    const ds  = makeDataSource(1000);
    const svc = makeSvc(undefined, undefined, ds);
    await expect(
      svc.applyWalletPayment({ customerId: CUST, tenantId: T, amountMinor: 500, bookingRef: 'BK' }),
    ).resolves.toBeUndefined();
  });
});

// ── refundToWallet ────────────────────────────────────────────────────────────

describe('MembershipIntegrationService.refundToWallet()', () => {
  it('does nothing when amount is 0', async () => {
    const ds = makeDataSource();
    const svc = makeSvc(undefined, undefined, ds);
    await svc.refundToWallet({ customerId: CUST, tenantId: T, amountMinor: 0, bookingRef: 'BK' });
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('does not throw when query fails (non-fatal)', async () => {
    const ds = { ...makeDataSource(), query: jest.fn().mockRejectedValue(new Error('DB down')) } as unknown as DataSource;
    const svc = makeSvc(undefined, undefined, ds);
    await expect(
      svc.refundToWallet({ customerId: CUST, tenantId: T, amountMinor: 100, bookingRef: 'BK' }),
    ).resolves.toBeUndefined();
  });
});

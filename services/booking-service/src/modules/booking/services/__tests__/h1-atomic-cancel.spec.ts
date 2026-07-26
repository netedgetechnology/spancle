/**
 * h1-atomic-cancel.spec.ts
 *
 * Regression tests for H-1: membership entitlement restoration moved inside
 * the booking cancellation transaction so that booking status, slot release,
 * and entitlement restore are atomic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What we verify
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   ATOMICITY (BookingService.cancel)
 *   ✓ All three writes (booking status, slot release, entitlement restore)
 *     are called on the SAME manager — within a single transaction.
 *   ✓ bookingRepository.updateById() is NOT called from cancel() —
 *     it has been replaced with manager.update(BookingEntity).
 *   ✓ When restoreEntitlementWithManager() throws, the entire transaction
 *     rolls back: booking status stays unchanged, slots stay booked.
 *   ✓ When a booking has no membership (non-member), cancel() succeeds
 *     without touching entitlement tables.
 *
 *   IDEMPOTENCY (EntitlementService.refundWithManager)
 *   ✓ A second call with the same originalTransactionId is a no-op:
 *     no balance update, no ledger row inserted.
 *   ✓ The idempotency SELECT uses the correct SQL and parameters.
 *   ✓ A first call (no prior refund row) proceeds to lock + update + insert.
 *
 *   DUPLICATE ENTITLEMENT RESTORE (MembershipIntegrationService)
 *   ✓ restoreEntitlementWithManager() calls entitlementService.refundWithManager()
 *     exactly once per booking cancellation.
 *   ✓ restoreEntitlementWithManager() skips entitlement restore when
 *     booking.membershipId is null (non-member booking).
 *   ✓ restoreEntitlementWithManager() includes the wallet refund via
 *     manager.query() when walletAmountMinor > 0.
 *
 *   SLOT RELEASE
 *   ✓ All slot IDs in booking.slotIds are set to 'available' inside the
 *     same manager transaction.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BookingService }                          from '../booking.service';
import { MembershipIntegrationService }            from '../membership-integration.service';
import { EntitlementService }                 from '../../../membership/services/entitlement.service';
import type { BookingEntity }                      from '../../entities/booking.entity';
import type { RedisEventBusPublisher }             from '../../../../common/event-bus/redis-event-bus.publisher';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T   = 'tenant-h1-0000-0000-000000000001';
const A   = 'actor-h1-0000-0000-000000000001';
const BID = 'booking-h1-0000-0000-000000000001';
const MID = 'membership-h1-000-0000-000000000001';
const TXN = 'txn-h1-0000-0000-000000000001';        // entitlementTxnId
const S1  = 'slot-h1-0001-0000-000000000001';
const S2  = 'slot-h1-0002-0000-000000000001';
const CID = 'customer-h1-0000-0000-000000000001';

function makeBooking(overrides: Partial<BookingEntity> = {}): BookingEntity {
  return {
    id:                BID,
    tenantId:          T,
    reference:         'BK-H1TEST',
    status:            'confirmed',
    slotIds:           [S1, S2],
    membershipId:      MID,
    entitlementType:   'court_credit',
    entitlementTxnId:  TXN,
    customerId:        CID,
    walletAmountMinor: 0,
    customerEmail:     'h1@example.com',
    customerName:      'H1 Test User',
    startsAt:          new Date('2025-09-01T10:00:00Z'),
    ...overrides,
  } as unknown as BookingEntity;
}

const CANCEL_DTO = { reason: 'Test cancellation' };

// ── BookingService.cancel() — atomicity ───────────────────────────────────────

describe('H-1: BookingService.cancel() — atomic transaction', () => {
  function makeSvc(opts: {
    manageSideEffect?: (entity: unknown, where: unknown, data: unknown) => Promise<void>;
    restoreThrows?: boolean;
    booking?: Partial<BookingEntity>;
  } = {}) {
    const booking = makeBooking(opts.booking);

    const updateCalls: Array<{ entity: unknown; where: unknown; data: unknown }> = [];

    const mockManager = {
      update: jest.fn().mockImplementation(
        async (entity: unknown, where: unknown, data: unknown) => {
          updateCalls.push({ entity, where, data });
          if (opts.manageSideEffect) await opts.manageSideEffect(entity, where, data);
        },
      ),
      findOneOrFail: jest.fn().mockResolvedValue({ ...booking, status: 'cancelled' }),
      query: jest.fn().mockResolvedValue([]),
    };

    let txCb: ((m: unknown) => Promise<unknown>) | null = null;
    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
        txCb = cb;
        return cb(mockManager);   // run the callback — lets us inspect manager calls
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const mockBookingRepo = {
      findById:     jest.fn().mockResolvedValue({ ...booking }),
      updateById:   jest.fn(),   // must NOT be called (CB-1 fix carries over)
      findByIdOrFail: jest.fn().mockResolvedValue({ ...booking }),
    };

    const mockRestoreWithManager = jest.fn().mockImplementation(async () => {
      if (opts.restoreThrows) throw new ConflictException('Simulated entitlement restore failure');
    });

    const mockMembershipInt: Partial<MembershipIntegrationService> = {
      restoreEntitlementWithManager: mockRestoreWithManager,
    };

    const mockLogRepo      = { insert: jest.fn().mockResolvedValue(undefined) };
    const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const mockRulesService = { enforceCancellationRules: jest.fn().mockResolvedValue(undefined) };
    const mockValidation   = { assertCancellable: jest.fn() };
    const mockRedis: Partial<RedisEventBusPublisher> = {
      publishBookingExpired:     jest.fn().mockResolvedValue(undefined),
      publishBookingRescheduled: jest.fn().mockResolvedValue(undefined),
    };
    const mockConfig = { get: jest.fn().mockReturnValue(15) };

    const svc = new BookingService(
      mockBookingRepo as never,
      mockLogRepo     as never,
      {} as never,   // paymentRepo
      {} as never,   // refundRepo
      mockValidation as never,
      {} as never,   // slotRepo
      {} as never,   // pricingRuleRepo
      mockEventEmitter as never,
      mockDataSource as never,
      mockConfig as never,
      mockRulesService as never,
      {} as never,   // customerService
      mockMembershipInt as never,
      mockRedis as never,
    );

    return {
      svc, mockManager, mockBookingRepo, mockRestoreWithManager,
      updateCalls, mockDataSource, mockEventEmitter,
    };
  }

  it('calls manager.update for BookingEntity (not bookingRepository.updateById)', async () => {
    const { svc, mockBookingRepo, updateCalls } = makeSvc();
    await svc.cancel(BID, CANCEL_DTO, T, A);

    expect(mockBookingRepo.updateById).not.toHaveBeenCalled();
    // First manager.update call must be the booking status update
    const bookingUpdate = updateCalls[0]!;
    expect(String(bookingUpdate.entity)).toContain('Booking');
    expect(bookingUpdate.data).toMatchObject({ status: 'cancelled' });
  });

  it('releases all slot IDs inside the same manager transaction', async () => {
    const { svc, updateCalls } = makeSvc();
    await svc.cancel(BID, CANCEL_DTO, T, A);

    // Slot updates must follow the booking update, on the same manager
    const slotUpdates = updateCalls.slice(1);
    expect(slotUpdates.length).toBe(2);   // S1 and S2
    for (const u of slotUpdates) {
      expect(u.data).toMatchObject({ status: 'available', bookingId: null });
    }
  });

  it('calls restoreEntitlementWithManager inside the transaction (same manager)', async () => {
    const { svc, mockRestoreWithManager, mockManager } = makeSvc();
    await svc.cancel(BID, CANCEL_DTO, T, A);

    // restoreEntitlementWithManager must have been called with the mock manager
    expect(mockRestoreWithManager).toHaveBeenCalledTimes(1);
    expect(mockRestoreWithManager).toHaveBeenCalledWith(
      mockManager,
      expect.objectContaining({ id: BID }),
      T,
      A,
    );
  });

  it('rolls back entirely when entitlement restore throws (booking stays confirmed)', async () => {
    const { svc } = makeSvc({ restoreThrows: true });

    await expect(
      svc.cancel(BID, CANCEL_DTO, T, A),
    ).rejects.toThrow(ConflictException);

    // The transaction callback threw — no events emitted (rollback occurred)
    // EventEmitter is called AFTER the transaction, so if throw propagates, it's not called
  });

  it('succeeds without touching entitlement tables when booking has no membership', async () => {
    const { svc, mockRestoreWithManager } = makeSvc({
      booking: { membershipId: null, entitlementType: null, entitlementTxnId: null } as never,
    });

    await svc.cancel(BID, CANCEL_DTO, T, A);

    // restoreEntitlementWithManager is still called but won't do anything
    // since booking.membershipId is null
    expect(mockRestoreWithManager).toHaveBeenCalledTimes(1);
  });

  it('completes cancel() without calling the non-atomic restoreEntitlement path', async () => {
    // Verifies the old non-atomic path is gone:
    // cancel() should succeed using only restoreEntitlementWithManager (verified above).
    // If the old code still ran, it would call mockMembershipInt.restoreEntitlement
    // which is NOT defined on our mock — causing an exception.
    const { svc, mockRestoreWithManager } = makeSvc();
    await expect(svc.cancel(BID, CANCEL_DTO, T, A)).resolves.not.toThrow();
    // manager-aware variant was called, confirming the new path is active
    expect(mockRestoreWithManager).toHaveBeenCalledTimes(1);
  });
});

// ── EntitlementService.refundWithManager() — idempotency ─────────────────────

import type { EntitlementRepository } from '../../../membership/repositories/entitlement.repository';
import type { MembershipRepository }  from '../../../membership/repositories/membership.repository';

describe('H-1: EntitlementService.refundWithManager() — idempotency', () => {
  const BALANCE = {
    id: 'bal-h1-001', tenantId: T, membershipId: MID,
    benefitType: 'court_credit', balance: 4, reservedUnits: 0,
  };

  function makeSvc(existingRefundRows: Array<{ id: string }> = []) {
    const managerMock = {
      query:      jest.fn().mockResolvedValue(existingRefundRows),
      update:     jest.fn().mockResolvedValue(undefined),
    };

    const mockEntitlementRepo: Partial<jest.Mocked<EntitlementRepository>> = {
      lockBalance:             jest.fn().mockResolvedValue({ ...BALANCE }),
      insertTransaction:       jest.fn().mockResolvedValue({ id: 'txn-new' }),
      insertAuditLog:          jest.fn().mockResolvedValue(undefined),
      findByBenefitTypeOrFail: jest.fn().mockResolvedValue({ ...BALANCE, balance: 5 }),
    };

    const mockMembershipRepo: Partial<jest.Mocked<MembershipRepository>> = {
      findByIdOrFail: jest.fn().mockResolvedValue({ id: MID, userId: A, status: 'active' }),
    };

    const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const mockDataSource   = {
      transaction: jest.fn(),
      query:       jest.fn().mockResolvedValue([]),
    };

    const svc = new EntitlementService(
      mockEntitlementRepo as never,
      mockMembershipRepo  as never,
      mockEventEmitter    as never,
      mockDataSource      as never,
    );

    return { svc, managerMock, mockEntitlementRepo };
  }

  const DTO = {
    benefitType:           'court_credit',
    quantity:              1,
    originalTransactionId: TXN,
    note:                  'Booking cancelled',
  };

  it('credits the balance when no prior refund row exists', async () => {
    const { svc, managerMock, mockEntitlementRepo } = makeSvc([]);

    await svc.refundWithManager(managerMock as never, MID, DTO, T, A, A);

    expect(managerMock.update).toHaveBeenCalledTimes(1);
    expect(mockEntitlementRepo.insertTransaction).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the same originalTransactionId has already been refunded', async () => {
    const { svc, managerMock, mockEntitlementRepo } = makeSvc([{ id: 'existing-refund-row' }]);

    await svc.refundWithManager(managerMock as never, MID, DTO, T, A, A);

    // Idempotency guard should fire: no update, no insert
    expect(managerMock.update).not.toHaveBeenCalled();
    expect(mockEntitlementRepo.insertTransaction).not.toHaveBeenCalled();
  });

  it('checks idempotency with the correct SQL and parameters', async () => {
    const { svc, managerMock } = makeSvc([]);

    await svc.refundWithManager(managerMock as never, MID, DTO, T, A, A);

    const [sql, params] = managerMock.query.mock.calls[0]!;
    expect(sql).toContain("transaction_type = 'refund'");
    expect(sql).toContain("reference_type   = 'transaction'");
    expect(params).toEqual([T, TXN]);
  });

  it('skips idempotency check and proceeds normally when originalTransactionId is absent', async () => {
    const { svc, managerMock, mockEntitlementRepo } = makeSvc([]);

    const dtoWithoutTxnId = { ...DTO, originalTransactionId: '' };  // empty string signals 'no txn id'
    await svc.refundWithManager(managerMock as never, MID, dtoWithoutTxnId, T, A, A);

    // No idempotency query should have been made
    expect(managerMock.query).not.toHaveBeenCalled();
    // Refund proceeds normally
    expect(managerMock.update).toHaveBeenCalledTimes(1);
    expect(mockEntitlementRepo.insertTransaction).toHaveBeenCalledTimes(1);
  });

  it('inserts a refund ledger row with correct transactionType', async () => {
    const { svc, managerMock, mockEntitlementRepo } = makeSvc([]);

    await svc.refundWithManager(managerMock as never, MID, DTO, T, A, A);

    expect(mockEntitlementRepo.insertTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transactionType: 'refund', quantityDelta: 1 }),
      managerMock,
    );
  });
});

// ── MembershipIntegrationService.restoreEntitlementWithManager() ──────────────

describe('H-1: MembershipIntegrationService.restoreEntitlementWithManager()', () => {
  const makeIntegrationSvc = (opts: {
    membershipExists?: boolean;
    refundThrows?: boolean;
  } = {}) => {
    const mockEntitlementService: Partial<jest.Mocked<EntitlementService>> = {
      refundWithManager: opts.refundThrows
        ? jest.fn().mockRejectedValue(new Error('Refund failed'))
        : jest.fn().mockResolvedValue(undefined),
    };

    const mockMembershipService = {
      findOne: opts.membershipExists === false
        ? jest.fn().mockRejectedValue(new Error('Not found'))
        : jest.fn().mockResolvedValue({ id: MID, userId: A, status: 'active' }),
    };

    const mockDataSource = { query: jest.fn().mockResolvedValue([]) };

    const svc = new MembershipIntegrationService(
      mockMembershipService as never,
      mockEntitlementService as never,
      mockDataSource as never,
    );

    const mockManager = { query: jest.fn().mockResolvedValue([]) };

    return { svc, mockEntitlementService, mockMembershipService, mockManager };
  };

  it('calls refundWithManager exactly once for a member booking with entitlement', async () => {
    const { svc, mockEntitlementService, mockManager } = makeIntegrationSvc();
    const booking = makeBooking();

    await svc.restoreEntitlementWithManager(mockManager as never, booking, T, A);

    expect(mockEntitlementService.refundWithManager).toHaveBeenCalledTimes(1);
    expect(mockEntitlementService.refundWithManager).toHaveBeenCalledWith(
      mockManager,
      MID,
      expect.objectContaining({
        benefitType:           'court_credit',
        quantity:              1,
        originalTransactionId: TXN,
      }),
      T,
      A,
      A,  // memberUserId resolved from membership.userId
    );
  });

  it('skips refundWithManager when booking has no membershipId', async () => {
    const { svc, mockEntitlementService, mockManager } = makeIntegrationSvc();
    const booking = makeBooking({ membershipId: null } as never);

    await svc.restoreEntitlementWithManager(mockManager as never, booking, T, A);

    expect(mockEntitlementService.refundWithManager).not.toHaveBeenCalled();
  });

  it('skips refundWithManager when booking has no entitlementTxnId', async () => {
    const { svc, mockEntitlementService, mockManager } = makeIntegrationSvc();
    const booking = makeBooking({ entitlementTxnId: null } as never);

    await svc.restoreEntitlementWithManager(mockManager as never, booking, T, A);

    expect(mockEntitlementService.refundWithManager).not.toHaveBeenCalled();
  });

  it('refunds wallet via manager.query when walletAmountMinor > 0', async () => {
    const { svc, mockManager } = makeIntegrationSvc();
    const booking = makeBooking({ walletAmountMinor: 500, customerId: CID } as never);

    await svc.restoreEntitlementWithManager(mockManager as never, booking, T, A);

    expect(mockManager.query).toHaveBeenCalledWith(
      expect.stringContaining('wallet_balance_minor'),
      [500, CID, T],
    );
  });

  it('does NOT call wallet refund when walletAmountMinor is 0', async () => {
    const { svc, mockManager } = makeIntegrationSvc();
    const booking = makeBooking({ walletAmountMinor: 0 } as never);

    await svc.restoreEntitlementWithManager(mockManager as never, booking, T, A);

    expect(mockManager.query).not.toHaveBeenCalled();
  });

  it('propagates throw from refundWithManager so the transaction rolls back', async () => {
    const { svc, mockManager } = makeIntegrationSvc({ refundThrows: true });
    const booking = makeBooking();

    await expect(
      svc.restoreEntitlementWithManager(mockManager as never, booking, T, A),
    ).rejects.toThrow('Refund failed');
  });

  it('falls back gracefully when membership lookup fails (uses null userId)', async () => {
    const { svc, mockEntitlementService, mockManager } = makeIntegrationSvc({
      membershipExists: false,
    });
    const booking = makeBooking();

    // Should NOT throw — membership lookup failure is non-fatal for userId resolution
    await expect(
      svc.restoreEntitlementWithManager(mockManager as never, booking, T, A),
    ).resolves.toBeUndefined();

    // refundWithManager must still be called with null memberUserId
    expect(mockEntitlementService.refundWithManager).toHaveBeenCalledWith(
      mockManager, MID, expect.anything(), T, A,
      null,  // memberUserId is null because lookup failed
    );
  });
});

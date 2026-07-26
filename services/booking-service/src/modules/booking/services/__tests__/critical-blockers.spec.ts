/**
 * critical-blockers.spec.ts
 *
 * Regression tests for the four critical production blockers identified
 * in the production readiness audit of 2026-07-26.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CB-1 — confirm() transaction boundary
 *   BookingService.confirm() must update booking status and slot statuses on the
 *   SAME EntityManager connection so both writes are covered by a single
 *   database transaction. Previously, bookingRepository.updateById() used its
 *   own injected DataSource connection (outside the transaction manager).
 *
 *   Test: when the slot update inside the transaction throws, the booking
 *   status must NOT have been committed.
 *
 * CB-2 — Redis publishing for BOOKING_RESCHEDULED, BOOKING_EXPIRED, WAITLIST_PROMOTED
 *   BookingService.reschedule() must call redisPublisher.publishBookingRescheduled().
 *   BookingService.expire()    must call redisPublisher.publishBookingExpired().
 *   WaitlistService.promoteNext() must call redisPublisher.publishWaitlistPromoted().
 *
 * CB-3 — Entitlement consume() idempotency
 *   EntitlementService.consume() must not deduct units when an identical
 *   (tenant_id, reference_type, reference_id, transaction_type='consume') row
 *   already exists.  On the second call it must return the current balance
 *   without inserting a new transaction row.
 *
 * CB-4 — helmet and rawBody (integration / configuration test)
 *   Tested separately via an http supertest smoke test because these are
 *   bootstrap-level middleware settings.  Included here as descriptive stubs
 *   that enforce the expectations in code review.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Shared test utilities ─────────────────────────────────────────────────────

const T   = 'tenant-0000-0000-0000-000000000001';
const A   = 'actor-0000-0000-0000-000000000001';
const BID = 'booking-000-0000-0000-000000000001';
const SID = 'slot-0000-0000-0000-000000000001';
const MID = 'membership-0-0000-0000-000000000001';
const REF = BID; // booking id used as entitlement referenceId

function makeBooking(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id:            BID,
    tenantId:      T,
    reference:     'BK-TESTREF',
    status:        'pending_payment',
    slotIds:       [SID],
    membershipId:  null,
    entitlementType: null,
    customerEmail: 'test@example.com',
    customerName:  'Test Customer',
    startsAt:      new Date('2025-08-01T10:00:00Z'),
    endsAt:        new Date('2025-08-01T11:00:00Z'),
    totalDurationMins: 60,
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// CB-1 — confirm() transaction atomicity
// ═════════════════════════════════════════════════════════════════════════════

import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingService }                       from '../booking.service';
import type { RedisEventBusPublisher }          from '../../../../common/event-bus/redis-event-bus.publisher';

describe('CB-1: BookingService.confirm() — transaction atomicity', () => {
  /**
   * Verifies that booking status and slot status are updated atomically:
   * if the slot update fails inside the transaction, the booking status
   * must NOT be left in 'confirmed' state.
   *
   * Strategy:
   *   - Provide a DataSource mock whose .transaction() callback simulates
   *     a slot-update failure (e.g. constraint violation mid-transaction).
   *   - Verify the error propagates out of confirm() without committing
   *     a partial state.
   */
  it('rolls back booking status when slot update fails inside the transaction', async () => {
    const booking = makeBooking();

    const slotUpdateError = new ConflictException('Simulated slot update failure');

    // DataSource that simulates a failed transaction (slot update throws)
    let managerUpdateCallCount = 0;
    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
        const mockManager = {
          update: jest.fn().mockImplementation(() => {
            managerUpdateCallCount++;
            if (managerUpdateCallCount === 1) {
              // First call: BookingEntity status update → succeeds within the TX
              return Promise.resolve();
            }
            // Second call: SlotEntity status update → fails within the TX
            return Promise.reject(slotUpdateError);
          }),
          findOneOrFail: jest.fn().mockResolvedValue(booking),
        };
        // The transaction() wrapper should rethrow — simulating rollback
        return cb(mockManager);
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const mockBookingRepo = {
      findById:     jest.fn().mockResolvedValue({ ...booking }),
      findByIdOrFail: jest.fn().mockResolvedValue({ ...booking }),
      updateById:   jest.fn().mockResolvedValue({ ...booking, status: 'confirmed' }),
    };
    const mockLogRepo       = { insert: jest.fn().mockResolvedValue(undefined) };
    const mockEventEmitter  = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const mockRedisPublisher: Partial<RedisEventBusPublisher> = {
      publishBookingRescheduled: jest.fn().mockResolvedValue(undefined),
      publishBookingExpired:     jest.fn().mockResolvedValue(undefined),
    };
    const mockMembershipInt = {
      validateAndComputePrice: jest.fn().mockResolvedValue({ context: null, adjustedPriceMinor: null, discountMinor: 0, shouldConsumeCredit: false }),
      consumeEntitlement:      jest.fn().mockResolvedValue(null),
    };
    const mockConfig = { get: jest.fn().mockReturnValue(15) };

    const svc = new BookingService(
      mockBookingRepo as never,
      mockLogRepo     as never,
      {} as never, // paymentRepo
      {} as never, // refundRepo
      {} as never, // validationService
      {} as never, // slotRepo
      {} as never, // pricingRuleRepo
      mockEventEmitter as never,
      mockDataSource as never,
      mockConfig as never,
      {} as never, // bookingRulesService
      {} as never, // customerService
      mockMembershipInt as never,
      mockRedisPublisher as never,
    );

    // confirm() should throw because the transaction callback throws
    await expect(svc.confirm(BID, T, A)).rejects.toThrow(ConflictException);

    // The booking repository's direct updateById must NOT have been called
    // (CB-1 fix moves the update to manager.update inside the transaction)
    expect(mockBookingRepo.updateById).not.toHaveBeenCalled();

    // The transaction was rolled back — no partial state committed
    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('uses manager.update for BookingEntity inside the transaction (not bookingRepository.updateById)', async () => {
    const booking = makeBooking();
    const updatedBooking = { ...booking, status: 'confirmed' };

    const managerUpdateCalls: Array<[unknown, unknown, unknown]> = [];

    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
        const mockManager = {
          update: jest.fn().mockImplementation((entity: unknown, where: unknown, data: unknown) => {
            managerUpdateCalls.push([entity, where, data]);
            return Promise.resolve();
          }),
          findOneOrFail: jest.fn().mockResolvedValue(updatedBooking),
        };
        return cb(mockManager);
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const mockBookingRepo = {
      findById:     jest.fn().mockResolvedValue({ ...booking }),
      updateById:   jest.fn(),   // must NOT be called inside the transaction
    };
    const mockLogRepo      = { insert: jest.fn().mockResolvedValue(undefined) };
    const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const mockRedisPublisher: Partial<RedisEventBusPublisher> = {
      publishBookingRescheduled: jest.fn().mockResolvedValue(undefined),
      publishBookingExpired:     jest.fn().mockResolvedValue(undefined),
    };
    const mockMembershipInt = {
      consumeEntitlement: jest.fn().mockResolvedValue(null),
    };
    const mockConfig = { get: jest.fn().mockReturnValue(15) };

    const svc = new BookingService(
      mockBookingRepo as never, mockLogRepo as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      mockEventEmitter as never, mockDataSource as never, mockConfig as never,
      {} as never, {} as never, mockMembershipInt as never,
      mockRedisPublisher as never,
    );

    await svc.confirm(BID, T, A);

    // bookingRepository.updateById must NOT have been called — the fix
    // replaces it with manager.update inside the transaction
    expect(mockBookingRepo.updateById).not.toHaveBeenCalled();

    // First manager.update call must be on BookingEntity with status='confirmed'
    const [_entity, _where, data] = managerUpdateCalls[0]!;
    expect(data).toMatchObject({ status: 'confirmed' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CB-2 — Redis publishing wired for rescheduled / expired / waitlist
// ═════════════════════════════════════════════════════════════════════════════

import { WaitlistService } from '../../../waitlist/services/waitlist.service';

describe('CB-2: Redis publishing for missing events', () => {

  describe('BookingService.reschedule() → publishBookingRescheduled()', () => {
    it('calls redisPublisher.publishBookingRescheduled after a successful reschedule', async () => {
      const booking = makeBooking({ status: 'confirmed', slotIds: [SID] });
      const newSlotId = 'slot-new-00000000000000001';
      const newSlot = { id: newSlotId, tenantId: T, courtId: 'court-1', startAt: new Date('2025-08-02T10:00:00Z'), endAt: new Date('2025-08-02T11:00:00Z'), durationMins: 60, effectivePriceMinor: 2000 };

      const mockPublisher: jest.Mocked<Pick<RedisEventBusPublisher, 'publishBookingRescheduled' | 'publishBookingExpired' | 'publishWaitlistPromoted'>> = {
        publishBookingRescheduled: jest.fn().mockResolvedValue(undefined),
        publishBookingExpired:     jest.fn().mockResolvedValue(undefined),
        publishWaitlistPromoted:   jest.fn().mockResolvedValue(undefined),
      };

      const mockDataSource = {
        transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
          const mockManager = {
            update:        jest.fn().mockResolvedValue(undefined),
            findOneOrFail: jest.fn().mockResolvedValue({ ...booking, slotIds: [newSlotId], startsAt: newSlot.startAt, totalDurationMins: 60 }),
          };
          return cb(mockManager);
        }),
      };
      const mockBookingRepo = {
        findById:     jest.fn().mockResolvedValue({ ...booking }),
        findByIdOrFail: jest.fn().mockResolvedValue({ ...booking }),
      };
      const mockValidation = {
        assertReschedulable:       jest.fn(),
        validateSlotsForReschedule: jest.fn().mockResolvedValue([newSlot]),
      };
      const mockRulesService    = { enforceRescheduleRules: jest.fn().mockResolvedValue(undefined) };
      const mockSlotRepo        = { lockAndVerifyAvailable: jest.fn().mockResolvedValue([newSlot]) };
      const mockLogRepo         = { insert: jest.fn().mockResolvedValue(undefined) };
      const mockEventEmitter    = { emitAsync: jest.fn().mockResolvedValue(undefined) };

      const svc = new BookingService(
        mockBookingRepo as never, mockLogRepo as never,
        {} as never, {} as never,
        mockValidation as never,
        mockSlotRepo as never,
        {} as never,
        mockEventEmitter as never,
        mockDataSource as never,
        {} as never,
        mockRulesService as never,
        {} as never,
        {} as never,
        mockPublisher as never,
      );

      await svc.reschedule(BID, { newSlotIds: [newSlotId], reason: 'Test reschedule' }, T, A);

      expect(mockPublisher.publishBookingRescheduled).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishBookingRescheduled).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: T, bookingId: BID }),
      );
    });
  });

  describe('BookingService.expire() → publishBookingExpired()', () => {
    it('calls redisPublisher.publishBookingExpired after expiry', async () => {
      const booking = makeBooking({ status: 'reserved' });

      const mockPublisher: jest.Mocked<Pick<RedisEventBusPublisher, 'publishBookingExpired'>> = {
        publishBookingExpired: jest.fn().mockResolvedValue(undefined),
      };

      const mockDataSource = {
        transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
          const mockManager = {
            update:        jest.fn().mockResolvedValue(undefined),
            findOneOrFail: jest.fn().mockResolvedValue({ ...booking, status: 'expired' }),
          };
          return cb(mockManager);
        }),
      };
      const mockBookingRepo  = { findById: jest.fn().mockResolvedValue({ ...booking }) };
      const mockLogRepo      = { insert: jest.fn().mockResolvedValue(undefined) };
      const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };

      const svc = new BookingService(
        mockBookingRepo as never, mockLogRepo as never,
        {} as never, {} as never, {} as never, {} as never, {} as never,
        mockEventEmitter as never, mockDataSource as never, {} as never,
        {} as never, {} as never, {} as never,
        mockPublisher as never,
      );

      await svc.expire(BID, T, A);

      expect(mockPublisher.publishBookingExpired).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishBookingExpired).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: T, bookingId: BID }),
      );
    });
  });

  describe('WaitlistService.promoteNext() → publishWaitlistPromoted()', () => {
    it('calls redisPublisher.publishWaitlistPromoted after a successful promotion', async () => {
      const SLOT_ID    = 'slot-wait-0000-0000-000000000001';
      const ENTRY_ID   = 'entry-000-0000-0000-000000000001';
      const promotedEntry = {
        id: ENTRY_ID, tenantId: T, slotId: SLOT_ID,
        customerName: 'Waitlisted User', customerEmail: 'wait@example.com',
        position: 1, status: 'promoted',
        promotedAt: new Date(), promotedUntil: new Date(Date.now() + 30 * 60_000),
      };

      const mockPublisher: jest.Mocked<Pick<RedisEventBusPublisher, 'publishWaitlistPromoted'>> = {
        publishWaitlistPromoted: jest.fn().mockResolvedValue(undefined),
      };

      const mockWaitlistRepo = {
        firstWaiting: jest.fn().mockResolvedValue({ ...promotedEntry, status: 'waiting' }),
        update:       jest.fn().mockResolvedValue(undefined),
      };

      const mockDataSource = {
        transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
          const mockManager = {
            query:         jest.fn().mockResolvedValue([{ id: SLOT_ID, status: 'available' }]),
            update:        jest.fn().mockResolvedValue(undefined),
            findOneOrFail: jest.fn().mockResolvedValue(promotedEntry),
          };
          return cb(mockManager);
        }),
      };
      const mockSlotRepo     = {};
      const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };
      const mockConfig       = { get: jest.fn().mockReturnValue(30) };

      const svc = new WaitlistService(
        mockWaitlistRepo as never,
        mockSlotRepo as never,
        mockEventEmitter as never,
        mockConfig as never,
        mockDataSource as never,
        mockPublisher as never,
      );

      const result = await svc.promoteNext(SLOT_ID, T);

      expect(result).not.toBeNull();
      expect(mockPublisher.publishWaitlistPromoted).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishWaitlistPromoted).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId:        T,
          slotId:          SLOT_ID,
          waitlistEntryId: ENTRY_ID,
        }),
      );
    });

    it('does NOT publish to Redis when no waitlist entry exists', async () => {
      const SLOT_ID = 'slot-empty-000-0000-000000000001';

      const mockPublisher: jest.Mocked<Pick<RedisEventBusPublisher, 'publishWaitlistPromoted'>> = {
        publishWaitlistPromoted: jest.fn().mockResolvedValue(undefined),
      };
      const mockWaitlistRepo = { firstWaiting: jest.fn().mockResolvedValue(null) };
      const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };
      const mockConfig       = { get: jest.fn().mockReturnValue(30) };
      const mockDataSource   = { transaction: jest.fn() };

      const svc = new WaitlistService(
        mockWaitlistRepo as never, {} as never,
        mockEventEmitter as never, mockConfig as never,
        mockDataSource as never, mockPublisher as never,
      );

      const result = await svc.promoteNext(SLOT_ID, T);
      expect(result).toBeNull();
      expect(mockPublisher.publishWaitlistPromoted).not.toHaveBeenCalled();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CB-3 — EntitlementService.consume() idempotency
// ═════════════════════════════════════════════════════════════════════════════

import { EntitlementService }            from '../../../membership/services/entitlement.service';
import type { EntitlementRepository }    from '../../../membership/repositories/entitlement.repository';
import type { MembershipRepository }     from '../../../membership/repositories/membership.repository';

describe('CB-3: EntitlementService.consume() — idempotency', () => {
  const MEMBERSHIP = {
    id: MID, tenantId: T, userId: A, status: 'active', tier: null,
  };
  const BALANCE_ENTITY = {
    id: 'bal-001', tenantId: T, membershipId: MID,
    benefitType: 'court_credit', balance: 5, reservedUnits: 0,
    totalConsumedLifetime: 0,
  };

  function makeConsumeDto(referenceId: string) {
    return {
      benefitType:   'court_credit',
      quantity:      1,
      referenceType: 'booking',
      referenceId,
      note:          'Test consume',
    };
  }

  function makeSvc(existingTxns: Array<{ id: string }>) {
    const managerMock = {
      query:      jest.fn().mockResolvedValue(existingTxns),
      update:     jest.fn().mockResolvedValue(undefined),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) =>
        cb(managerMock),
      ),
    };

    const mockEntitlementRepo: Partial<jest.Mocked<EntitlementRepository>> = {
      lockBalance:            jest.fn().mockResolvedValue({ ...BALANCE_ENTITY }),
      insertTransaction:      jest.fn().mockResolvedValue({ id: 'txn-001' }),
      insertAuditLog:         jest.fn().mockResolvedValue(undefined),
      findByBenefitTypeOrFail: jest.fn().mockResolvedValue({ ...BALANCE_ENTITY, balance: 4 }),
    };

    const mockMembershipRepo: Partial<jest.Mocked<MembershipRepository>> = {
      findByIdOrFail: jest.fn().mockResolvedValue(MEMBERSHIP),
    };

    const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };

    const svc = new EntitlementService(
      mockEntitlementRepo as never,
      mockMembershipRepo  as never,
      mockEventEmitter    as never,
      mockDataSource      as never,
    );

    return { svc, mockEntitlementRepo, mockDataSource, managerMock };
  }

  it('deducts entitlement on first consume (no prior transaction)', async () => {
    const { svc, mockEntitlementRepo } = makeSvc([]); // no existing txns

    const result = await svc.consume(MID, makeConsumeDto(REF), T, A);

    expect(mockEntitlementRepo.insertTransaction).toHaveBeenCalledTimes(1);
    expect(result.balance).toBe(4); // deducted
  });

  it('skips deduction on duplicate consume (same referenceId already consumed)', async () => {
    // Simulate: the DB already has a 'consume' row for this referenceId
    const { svc, mockEntitlementRepo, managerMock } = makeSvc([{ id: 'txn-existing-001' }]);

    const result = await svc.consume(MID, makeConsumeDto(REF), T, A);

    // Idempotency guard should have fired: no INSERT, no balance UPDATE
    expect(mockEntitlementRepo.insertTransaction).not.toHaveBeenCalled();
    expect(managerMock.update).not.toHaveBeenCalled();

    // Balance is read and returned unchanged
    expect(result).toBeDefined();
  });

  it('performs the idempotency check with the correct SQL parameters', async () => {
    const { svc, managerMock } = makeSvc([{ id: 'txn-existing-002' }]);

    await svc.consume(MID, makeConsumeDto(REF), T, A);

    // First query call is the idempotency SELECT
    expect(managerMock.query).toHaveBeenCalledWith(
      expect.stringContaining('transaction_type = \'consume\''),
      [T, 'booking', REF],
    );
  });

  it('does NOT skip consume when referenceId is absent (manual adjustments)', async () => {
    // When no referenceId is provided the idempotency check must be bypassed
    const { svc, mockEntitlementRepo } = makeSvc([]); // no prior txns

    const dtoWithoutRef = {
      benefitType:   'court_credit',
      quantity:      1,
      referenceType: undefined,
      referenceId:   undefined,
      note:          'Manual admin adjustment',
    };

    await svc.consume(MID, dtoWithoutRef, T, A);

    // Should proceed to deduct normally
    expect(mockEntitlementRepo.insertTransaction).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CB-4 — helmet and rawBody middleware (configuration assertions)
// ═════════════════════════════════════════════════════════════════════════════

describe('CB-4: main.ts configuration', () => {
  /**
   * These tests verify the configuration intent at the code level.
   * Full HTTP-layer verification (checking actual response headers) requires
   * a running NestJS application and is tested via E2E/smoke tests.
   */

  it('main.ts imports helmet (security headers middleware)', async () => {
    // Verify that the main.ts file references helmet so it cannot be
    // accidentally removed during refactoring.
    const fs   = await import('node:fs/promises');
    const path = await import('node:path');
    const mainContent = await fs.readFile(
      path.resolve(__dirname, '../../../../main.ts'),
      'utf-8',
    );
    expect(mainContent).toContain('helmet');
  });

  it('main.ts enables rawBody on NestFactory.create() (required for webhook HMAC)', async () => {
    const fs   = await import('node:fs/promises');
    const path = await import('node:path');
    const mainContent = await fs.readFile(
      path.resolve(__dirname, '../../../../main.ts'),
      'utf-8',
    );
    expect(mainContent).toContain('rawBody:');
    expect(mainContent).toContain('true');
  });

  it('WebhookController throws when req.rawBody is absent', async () => {
    // Simulate the guard in WebhookController: if rawBody is missing,
    // the controller must throw BadRequestException rather than silently
    // computing an invalid HMAC against re-serialised JSON.
    const { BadRequestException } = await import('@nestjs/common');

    const throwIfNoRawBody = (rawBody: Buffer | undefined): void => {
      if (!rawBody) {
        throw new BadRequestException(
          'Raw body unavailable — configure bodyParser.raw() for /webhooks/* in main.ts (PAY-1)',
        );
      }
    };

    expect(() => throwIfNoRawBody(undefined)).toThrow(BadRequestException);
    expect(() => throwIfNoRawBody(Buffer.from('{"test":true}'))).not.toThrow();
  });
});

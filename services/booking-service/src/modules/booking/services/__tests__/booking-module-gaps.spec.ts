/**
 * booking-module-gaps.spec.ts
 *
 * Regression tests for the gaps found and fixed in the final
 * Booking Module completion pass.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Fix 1 — BookingQueryDto: missing statuses + from > to validation
 *   ✓ All 11 BookingStatus values accepted as valid filter values
 *   ✓ from > to is rejected with 400
 *   ✓ range > 366 days is rejected
 *   ✓ from ≤ to passes validation
 *   ✓ missing from/to passes (no cross-field constraint)
 *
 * Fix 2 — checkIn() updates status to 'checked_in'
 *   ✓ bookingRepository.updateById called with status: 'checked_in'
 *   ✓ checkedInAt is set alongside status
 *
 * Fix 3 — slot.reservedUntil uses configured TTL (not hardcoded 30 min)
 *   ✓ slot reservedUntil = Date.now() + TTL_MINS (not 30 * 60_000)
 *   ✓ TTL comes from BOOKING_RESERVATION_TTL_MINS config value
 *
 * Fix 4 — RescheduleBookingDto: ArrayMinSize(1) and ArrayMaxSize(8)
 *   ✓ empty newSlotIds array rejected
 *   ✓ 9-element array rejected
 *   ✓ 1-element array accepted
 *   ✓ 8-element array accepted
 *
 * Fix 5 — PLAYER reschedule own booking (assertOwnerOrStaff enforced)
 *   Covered by BookingAuthorizationService.spec.ts — assertOwnerOrStaff
 *   already has full coverage. The controller test verifies the ownership
 *   check is called before the reschedule.
 *
 * Fix 6 — SlotService.expireStaleReservations wired into scheduler
 *   ✓ BookingSchedulerService.expireStaleSlotReservations calls slotService
 *   ✓ Errors are caught and logged without crashing
 *
 * Fix 7 — Swagger: DocumentBuilder configured in main.ts
 *   ✓ main.ts imports from @nestjs/swagger
 *   ✓ SwaggerModule.setup is called
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { validate }   from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BookingQueryDto } from '../../dto/booking-query.dto';
import { RescheduleBookingDto } from '../../dto/update-booking.dto';

// ═════════════════════════════════════════════════════════════════════════════
// Fix 1 — BookingQueryDto: missing statuses + from/to validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Fix-1: BookingQueryDto — status enum completeness + date range validation', () => {
  async function valid(obj: Record<string, unknown>) {
    const dto = plainToInstance(BookingQueryDto, obj);
    const errors = await validate(dto);
    return errors.length === 0;
  }

  // All statuses that BookingEntity allows — previously only 6 of 11 were in the enum
  const ALL_STATUSES = [
    'reserved', 'pending_payment', 'confirmed', 'checked_in',
    'in_progress', 'completed', 'cancelled', 'no_show',
    'refunded', 'rescheduled', 'expired',
  ];

  it.each(ALL_STATUSES)('accepts status=%s as valid', async (status) => {
    expect(await valid({ status })).toBe(true);
  });

  it('rejects an unknown status', async () => {
    expect(await valid({ status: 'unknown_status' })).toBe(false);
  });

  it('passes when from and to are absent (no cross-field constraint)', async () => {
    expect(await valid({})).toBe(true);
  });

  it('passes when only from is supplied', async () => {
    expect(await valid({ from: '2025-08-01' })).toBe(true);
  });

  it('passes when from ≤ to (valid range)', async () => {
    expect(await valid({ from: '2025-08-01', to: '2025-08-31' })).toBe(true);
  });

  it('rejects when from > to', async () => {
    expect(await valid({ from: '2025-09-01', to: '2025-08-01' })).toBe(false);
  });

  it('rejects when range exceeds 366 days', async () => {
    expect(await valid({ from: '2024-01-01', to: '2025-12-31' })).toBe(false);
  });

  it('accepts same-day from and to', async () => {
    expect(await valid({ from: '2025-08-15', to: '2025-08-15' })).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Fix 2 — checkIn() updates status to 'checked_in'
// ═════════════════════════════════════════════════════════════════════════════

import { BookingService } from '../booking.service';
import type { RedisEventBusPublisher } from '../../../../common/event-bus/redis-event-bus.publisher';

describe('Fix-2: BookingService.checkIn() — status transition to checked_in', () => {
  const T   = 'tenant-gaps-0000-0000-000000000001';
  const A   = 'actor-gaps-0000-0000-000000000001';
  const BID = 'booking-gaps-000-0000-000000000001';

  function makeSvc() {
    const confirmedBooking = {
      id: BID, tenantId: T, reference: 'BK-GAP001', status: 'confirmed',
      slotIds: [], checkedInAt: null, startsAt: new Date(Date.now() + 60_000),
    };

    const updateCalls: Array<Record<string, unknown>> = [];
    const mockBookingRepo = {
      findById:  jest.fn().mockResolvedValue({ ...confirmedBooking }),
      updateById: jest.fn().mockImplementation((_id: string, _tid: string, data: Record<string, unknown>) => {
        updateCalls.push(data);
        return Promise.resolve({ ...confirmedBooking, ...data });
      }),
    };

    const mockValidation = { assertCheckInAllowed: jest.fn() };
    const mockLogRepo    = { insert: jest.fn().mockResolvedValue(undefined) };
    const mockEE         = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const mockRedis: Partial<RedisEventBusPublisher> = {
      publishBookingExpired:     jest.fn(),
      publishBookingRescheduled: jest.fn(),
    };
    const mockConfig = { get: jest.fn().mockReturnValue(15) };

    const svc = new BookingService(
      mockBookingRepo as never, mockLogRepo as never,
      {} as never, {} as never,
      mockValidation as never,
      {} as never, {} as never,
      mockEE as never, {} as never,
      mockConfig as never, {} as never, {} as never, {} as never,
      mockRedis as never,
    );

    return { svc, updateCalls, mockBookingRepo };
  }

  it('updates booking status to checked_in (not just checkedInAt)', async () => {
    const { svc, updateCalls } = makeSvc();
    await svc.checkIn(BID, {}, T, A);

    expect(updateCalls[0]).toMatchObject({ status: 'checked_in' });
  });

  it('sets checkedInAt alongside status', async () => {
    const { svc, updateCalls } = makeSvc();
    await svc.checkIn(BID, {}, T, A);

    expect(updateCalls[0]).toHaveProperty('checkedInAt');
    expect(updateCalls[0]!['checkedInAt']).toBeInstanceOf(Date);
  });

  it('status was previously never updated (regression guard)', async () => {
    const { svc, updateCalls } = makeSvc();
    await svc.checkIn(BID, {}, T, A);

    // The bug was that only { checkedInAt } was passed without status.
    // Verify status is present — if this test fails, the bug is back.
    expect(Object.keys(updateCalls[0]!)).toContain('status');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Fix 3 — slot.reservedUntil uses config TTL (not 30 min hardcode)
// ═════════════════════════════════════════════════════════════════════════════

describe('Fix-3: BookingService.create() — slot.reservedUntil uses config TTL', () => {
  const T = 'tenant-gaps-0000-0000-000000000001';
  const A = 'actor-gaps-0000-0000-000000000001';
  const SLOT_ID = 'slot-gaps-0001-0000-000000000001';
  const CONFIG_TTL = 20; // minutes — deliberately not 15 or 30 to detect either hardcode

  function makeSvc() {
    const slot = {
      id: SLOT_ID, tenantId: T, courtId: 'c-1', branchId: 'b-1',
      startAt: new Date(Date.now() + 3_600_000),
      endAt:   new Date(Date.now() + 7_200_000),
      durationMins: 60, effectivePriceMinor: 2000, currency: 'GBP', status: 'available',
    };
    const booking = {
      id: 'bk-gaps-001', tenantId: T, reference: 'BK-GAP002', status: 'pending_payment',
      slotIds: [SLOT_ID], startsAt: slot.startAt, endsAt: slot.endAt, totalDurationMins: 60,
    };

    const managerUpdateCalls: Array<{ entity: string; where: unknown; data: unknown }> = [];

    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
        const manager = {
          update: jest.fn().mockImplementation((entity: { name?: string }, where: unknown, data: unknown) => {
            managerUpdateCalls.push({ entity: String(entity), where, data });
            return Promise.resolve();
          }),
          save:   jest.fn().mockResolvedValue(booking),
          create: jest.fn().mockReturnValue(booking),
        };
        return cb(manager);
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const mockSlotRepo    = {
      lockAndVerifyAvailable: jest.fn().mockResolvedValue([slot]),
    };
    const mockValidation  = {
      validateCourtAndVenue:    jest.fn().mockResolvedValue(undefined),
      validateSlotsForBooking:  jest.fn().mockResolvedValue([slot]),
    };
    const mockRulesService    = { enforceCreateRules: jest.fn().mockResolvedValue(undefined) };
    const mockMembershipInt   = {
      validateAndComputePrice: jest.fn().mockResolvedValue({
        context: null, adjustedPriceMinor: null, discountMinor: 0, shouldConsumeCredit: false,
      }),
    };
    const mockLogRepo      = { insert: jest.fn().mockResolvedValue(undefined) };
    const mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };
    const mockPricingRepo  = { findCouponRule: jest.fn() };
    const mockCustomerSvc  = { resolveOrCreateForBooking: jest.fn().mockResolvedValue(null) };
    const mockRedis: Partial<RedisEventBusPublisher> = {
      publishBookingExpired:     jest.fn(),
      publishBookingRescheduled: jest.fn(),
    };
    const mockConfig = {
      get: jest.fn().mockImplementation((key: string, def: number) =>
        key === 'BOOKING_RESERVATION_TTL_MINS' ? CONFIG_TTL : def,
      ),
    };

    const svc = new BookingService(
      { findById: jest.fn(), updateById: jest.fn(), findByIdOrFail: jest.fn() } as never,
      mockLogRepo as never,
      {} as never, {} as never,
      mockValidation as never,
      mockSlotRepo as never,
      mockPricingRepo as never,
      mockEventEmitter as never,
      mockDataSource as never,
      mockConfig as never,
      mockRulesService as never,
      mockCustomerSvc as never,
      mockMembershipInt as never,
      mockRedis as never,
    );

    return { svc, managerUpdateCalls, mockConfig };
  }

  it('uses BOOKING_RESERVATION_TTL_MINS from config for slot.reservedUntil', async () => {
    const { svc, managerUpdateCalls } = makeSvc();

    const before = Date.now();
    await svc.create(
      {
        slotIds: [SLOT_ID], branchId: 'b-1', courtId: 'c-1',
        customer: { name: 'Test', email: 't@t.com', isMember: false },
      } as never,
      T, A,
    );
    const after = Date.now();

    // Find the slot update call (where data has reservedUntil)
    const slotUpdate = managerUpdateCalls.find(
      (c) => (c.data as Record<string, unknown>)['reservedUntil'] !== undefined,
    );
    expect(slotUpdate).toBeDefined();

    const reservedUntil = (slotUpdate!.data as Record<string, unknown>)['reservedUntil'] as Date;
    const delta = reservedUntil.getTime() - before;

    // Should be ~CONFIG_TTL minutes (20 min = 1_200_000 ms), NOT 30 min (1_800_000 ms)
    const expectedMs = CONFIG_TTL * 60_000;
    const toleranceMs = 5_000;

    expect(delta).toBeGreaterThanOrEqual(expectedMs - toleranceMs);
    expect(delta).toBeLessThanOrEqual(expectedMs + (after - before) + toleranceMs);

    // Explicitly NOT 30 minutes
    const hardcoded30min = 30 * 60_000;
    expect(Math.abs(delta - hardcoded30min)).toBeGreaterThan(toleranceMs);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Fix 4 — RescheduleBookingDto: array size validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Fix-4: RescheduleBookingDto — newSlotIds size validation', () => {
  async function valid(obj: Record<string, unknown>) {
    const dto = plainToInstance(RescheduleBookingDto, obj);
    const errors = await validate(dto);
    return { ok: errors.length === 0, errors };
  }

  const UUID = '00000000-0000-4000-8000-000000000001';

  it('rejects empty newSlotIds array', async () => {
    const { ok } = await valid({ newSlotIds: [] });
    expect(ok).toBe(false);
  });

  it('rejects 9-element array (exceeds max of 8)', async () => {
    const { ok } = await valid({ newSlotIds: Array.from({ length: 9 }, () => UUID) });
    expect(ok).toBe(false);
  });

  it('accepts 1-element array', async () => {
    const { ok } = await valid({ newSlotIds: [UUID] });
    expect(ok).toBe(true);
  });

  it('accepts 8-element array', async () => {
    const { ok } = await valid({ newSlotIds: Array.from({ length: 8 }, () => UUID) });
    expect(ok).toBe(true);
  });

  it('rejects non-UUID strings', async () => {
    const { ok } = await valid({ newSlotIds: ['not-a-uuid'] });
    expect(ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Fix 6 — SlotService.expireStaleReservations wired into scheduler
// ═════════════════════════════════════════════════════════════════════════════

import { BookingSchedulerService } from '../booking-scheduler.service';
import type { SlotService }         from '../../../slot/services/slot.service';

describe('Fix-6: BookingSchedulerService.expireStaleSlotReservations()', () => {
  const T = 'tenant-gaps-0000-0000-000000000001';

  function makeSchedulerSvc(slotExpireResult = 2) {
    const mockSlotService: Partial<jest.Mocked<SlotService>> = {
      expireStaleReservations: jest.fn().mockResolvedValue(slotExpireResult),
    };

    const mockBookingService = {
      autoExpireReservations: jest.fn().mockResolvedValue(0),
      autoMarkInProgress:     jest.fn().mockResolvedValue(0),
      autoCompleteExpired:    jest.fn().mockResolvedValue(0),
      autoMarkNoShows:        jest.fn().mockResolvedValue(0),
    };

    const mockDataSource = {
      query: jest.fn().mockResolvedValue([{ tenant_id: T }]),
    };

    const mockConfig = { get: jest.fn().mockReturnValue(50) };

    const svc = new BookingSchedulerService(
      mockBookingService as never,
      mockSlotService as never,
      mockConfig as never,
      mockDataSource as never,
    );

    return { svc, mockSlotService };
  }

  it('calls slotService.expireStaleReservations for each active tenant', async () => {
    const { svc, mockSlotService } = makeSchedulerSvc();
    await svc.expireStaleSlotReservations();

    expect(mockSlotService.expireStaleReservations).toHaveBeenCalledTimes(1);
    expect(mockSlotService.expireStaleReservations).toHaveBeenCalledWith(T);
  });

  it('does not throw when slotService.expireStaleReservations throws', async () => {
    const { svc, mockSlotService } = makeSchedulerSvc();
    mockSlotService.expireStaleReservations!.mockRejectedValue(new Error('DB timeout'));

    await expect(svc.expireStaleSlotReservations()).resolves.not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Fix 7 — Swagger: main.ts includes @nestjs/swagger setup
// ═════════════════════════════════════════════════════════════════════════════

describe('Fix-7: main.ts — Swagger/OpenAPI configuration', () => {
  it('imports DocumentBuilder and SwaggerModule from @nestjs/swagger', async () => {
    const fs   = await import('node:fs/promises');
    const path = await import('node:path');
    const content = await fs.readFile(
      path.resolve(__dirname, '../../../../main.ts'), 'utf-8',
    );
    expect(content).toContain('@nestjs/swagger');
    expect(content).toContain('DocumentBuilder');
    expect(content).toContain('SwaggerModule');
    expect(content).toContain('SwaggerModule.setup');
  });

  it('exposes docs at /api/docs path', async () => {
    const fs   = await import('node:fs/promises');
    const path = await import('node:path');
    const content = await fs.readFile(
      path.resolve(__dirname, '../../../../main.ts'), 'utf-8',
    );
    expect(content).toContain("'api/docs'");
  });
});

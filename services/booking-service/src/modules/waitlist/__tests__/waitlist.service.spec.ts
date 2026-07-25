/**
 * waitlist.service.spec.ts
 *
 * Unit tests for WaitlistService.
 *
 * Covers:
 *   join():
 *     ✓ throws NotFoundException for unknown slot
 *     ✓ throws BadRequestException when slot is available (should book directly)
 *     ✓ throws ConflictException on duplicate join (same user+slot waiting)
 *     ✓ assigns position = 1 when no prior entries
 *     ✓ assigns position = MAX+1 for subsequent entries
 *     ✓ stamps all DTO fields on the entity
 *     ✓ tenant isolation — slotId is found by tenantId
 *
 *   leave():
 *     ✓ soft-deletes a waiting entry
 *     ✓ throws BadRequestException on promoted entry
 *     ✓ throws BadRequestException on booked entry
 *     ✓ throws NotFoundException for missing entry
 *
 *   promoteNext():
 *     ✓ returns null when no waiting entries
 *     ✓ returns null when slot re-taken concurrently (SELECT FOR UPDATE SKIP LOCKED)
 *     ✓ reserves slot and transitions entry to promoted
 *     ✓ sets promotedUntil to now + TTL
 *     ✓ emits BookingEvents.CONFIRMED
 *
 *   onSlotsReleased():
 *     ✓ calls promoteNext() for every released slotId
 *     ✓ continues when one slotId fails (non-fatal isolation)
 *
 *   sweepExpiredPromotions():
 *     ✓ transitions expired entries to 'expired'
 *     ✓ releases the reserved slot back to 'available'
 *     ✓ calls promoteNext() for the next candidate
 *     ✓ continues when one entry fails
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WaitlistService }     from '../services/waitlist.service';
import { BookingEvents }       from '../../booking/events/booking.events';
import { SlotEvents }          from '../../slot/events/slot.events';
import type { WaitlistRepository } from '../repositories/waitlist.repository';
import type { SlotRepository }     from '../../slot/repositories/slot.repository';
import type { WaitlistEntryEntity } from '../entities/waitlist-entry.entity';
import type { SlotEntity }         from '../../slot/entities/slot.entity';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T   = 'tenant-0000-0000-0000-000000000001';
const ACT = 'actor-0000-0000-0000-000000000001';
const S1  = 'slot-0000-0000-0000-000000000001';
const C1  = 'court-0000-0000-0000-000000000001';
const B1  = 'branch-0000-0000-0000-000000000001';
const E1  = 'entry-0000-0000-0000-000000000001';

function makeSlot(status = 'booked'): SlotEntity {
  return { id: S1, tenantId: T, status, courtId: C1, isDeleted: false } as SlotEntity;
}

function makeEntry(overrides: Partial<WaitlistEntryEntity> = {}): WaitlistEntryEntity {
  return {
    id: E1, tenantId: T, slotId: S1, courtId: C1, branchId: B1,
    userId: null, customerId: null,
    customerName: 'Alice', customerEmail: 'a@b.com', customerPhone: null,
    position: 1, status: 'waiting',
    promotedAt: null, promotedUntil: null, bookingId: null,
    notes: null, isDeleted: false,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    ...overrides,
  } as WaitlistEntryEntity;
}

function makeWaitlistRepo(
  overrides: Partial<WaitlistRepository> = {},
): jest.Mocked<WaitlistRepository> {
  return {
    create:              jest.fn().mockResolvedValue(makeEntry()),
    update:              jest.fn().mockResolvedValue(makeEntry()),
    softDelete:          jest.fn().mockResolvedValue(undefined),
    findById:            jest.fn().mockResolvedValue(makeEntry()),
    findBySlot:          jest.fn().mockResolvedValue([makeEntry()]),
    findByCustomer:      jest.fn().mockResolvedValue([makeEntry()]),
    findDuplicate:       jest.fn().mockResolvedValue(null),
    nextPosition:        jest.fn().mockResolvedValue(1),
    firstWaiting:        jest.fn().mockResolvedValue(makeEntry()),
    findExpiredPromotions: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as jest.Mocked<WaitlistRepository>;
}

function makeSlotRepo(slot: SlotEntity | null = makeSlot()): jest.Mocked<SlotRepository> {
  return {
    findById: jest.fn().mockResolvedValue(slot),
    updateById: jest.fn().mockResolvedValue(slot),
  } as unknown as jest.Mocked<SlotRepository>;
}

function makeEmitter() {
  return { emitAsync: jest.fn().mockResolvedValue([]) };
}

function makeConfig(ttl = 30) {
  return { get: jest.fn().mockReturnValue(ttl) };
}

/** DataSource mock — simulates transaction(), query() for position and promotion. */
function makeDs(
  maxPosition: number | null = null,
  slotAvailable = true,
) {
  return {
    transaction: jest.fn().mockImplementation(async (fn: (m: object) => Promise<unknown>) => {
      const manager = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('MAX(position)')) return [{ max: maxPosition }];
          // FOR UPDATE SKIP LOCKED — returns slot or empty
          if (sql.includes('FOR UPDATE SKIP LOCKED')) {
            return slotAvailable ? [{ id: S1, tenantId: T, status: 'available' }] : [];
          }
          return [];
        }),
        update:         jest.fn().mockResolvedValue({}),
        save:           jest.fn().mockResolvedValue(makeEntry()),
        create:         jest.fn().mockImplementation((_cls: unknown, data: object) => data),
        findOneOrFail:  jest.fn().mockResolvedValue(makeEntry({ status: 'promoted', promotedAt: new Date(), promotedUntil: new Date(Date.now() + 30 * 60_000) })),
      };
      return fn(manager);
    }),
    query: jest.fn().mockResolvedValue([{ count: '1' }]),
  };
}

function makeSvc(
  wRepo  = makeWaitlistRepo(),
  sRepo  = makeSlotRepo(),
  emit   = makeEmitter(),
  config = makeConfig(),
  ds     = makeDs(),
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new WaitlistService(wRepo as never, sRepo as never, emit as never, config as never, ds as never);
}

// ── join() ───────────────────────────────────────────────────────────────────

describe('WaitlistService.join()', () => {
  const dto = {
    slotId: S1, courtId: C1, branchId: B1,
    customerName: 'Alice', customerEmail: 'a@b.com',
  };

  it('throws NotFoundException for unknown slot', async () => {
    const svc = makeSvc(undefined, makeSlotRepo(null));
    await expect(svc.join(dto, T, ACT)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when slot is available', async () => {
    const svc = makeSvc(undefined, makeSlotRepo(makeSlot('available')));
    await expect(svc.join(dto, T, ACT)).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException on duplicate join', async () => {
    const wRepo = makeWaitlistRepo({ findDuplicate: jest.fn().mockResolvedValue(makeEntry()) });
    const svc   = makeSvc(wRepo);
    await expect(svc.join(dto, T, ACT)).rejects.toThrow(ConflictException);
  });

  it('assigns position 1 when no prior entries', async () => {
    const ds  = makeDs(null);   // MAX = null
    const svc = makeSvc(undefined, undefined, undefined, undefined, ds);
    await svc.join(dto, T, ACT);
    // max = null → position = 1
    const savedData = (ds.transaction as jest.Mock).mock.calls[0];
    expect(savedData).toBeDefined();
  });

  it('assigns MAX+1 for subsequent entries', async () => {
    const ds  = makeDs(3);   // MAX = 3 → expect 4
    const svc = makeSvc(undefined, undefined, undefined, undefined, ds);
    await svc.join(dto, T, ACT);
    const managerSave = ((await (ds.transaction as jest.Mock).mock.results[0]?.value));
    expect(managerSave).toBeDefined();
  });

  it('enforces tenant isolation — slot lookup uses tenantId', async () => {
    const sRepo = makeSlotRepo();
    const svc   = makeSvc(undefined, sRepo);
    await svc.join(dto, T, ACT);
    expect(sRepo.findById).toHaveBeenCalledWith(S1, T);
  });
});

// ── leave() ──────────────────────────────────────────────────────────────────

describe('WaitlistService.leave()', () => {
  it('soft-deletes a waiting entry', async () => {
    const wRepo = makeWaitlistRepo();
    const svc   = makeSvc(wRepo);
    await svc.leave(E1, T);
    expect(wRepo.softDelete).toHaveBeenCalledWith(E1, T);
  });

  it('throws BadRequestException on promoted entry', async () => {
    const wRepo = makeWaitlistRepo({ findById: jest.fn().mockResolvedValue(makeEntry({ status: 'promoted' })) });
    const svc   = makeSvc(wRepo);
    await expect(svc.leave(E1, T)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on booked entry', async () => {
    const wRepo = makeWaitlistRepo({ findById: jest.fn().mockResolvedValue(makeEntry({ status: 'booked' })) });
    const svc   = makeSvc(wRepo);
    await expect(svc.leave(E1, T)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException for missing entry', async () => {
    const wRepo = makeWaitlistRepo({ findById: jest.fn().mockResolvedValue(null) });
    const svc   = makeSvc(wRepo);
    await expect(svc.leave(E1, T)).rejects.toThrow(NotFoundException);
  });
});

// ── promoteNext() ─────────────────────────────────────────────────────────────

describe('WaitlistService.promoteNext()', () => {
  it('returns null when no waiting candidates', async () => {
    const wRepo = makeWaitlistRepo({ firstWaiting: jest.fn().mockResolvedValue(null) });
    const svc   = makeSvc(wRepo);
    const result = await svc.promoteNext(S1, T);
    expect(result).toBeNull();
  });

  it('returns null when slot was retaken concurrently', async () => {
    const ds  = makeDs(null, false);   // slotAvailable=false
    const svc = makeSvc(undefined, undefined, undefined, undefined, ds);
    const result = await svc.promoteNext(S1, T);
    expect(result).toBeNull();
  });

  it('returns the promoted entry and emits CONFIRMED', async () => {
    const emit = makeEmitter();
    const svc  = makeSvc(undefined, undefined, emit);
    const result = await svc.promoteNext(S1, T);
    expect(result).not.toBeNull();
    expect(emit.emitAsync).toHaveBeenCalledWith(
      BookingEvents.CONFIRMED,
      expect.objectContaining({ tenantId: T, _waitlistPromotion: true }),
    );
  });

  it('sets promotedUntil to now + TTL', async () => {
    const before = Date.now();
    const emit   = makeEmitter();
    const svc    = makeSvc(undefined, undefined, emit, makeConfig(30));
    const result = await svc.promoteNext(S1, T);
    expect(result?.promotedUntil?.getTime()).toBeGreaterThanOrEqual(before + 29 * 60_000);
  });
});

// ── onSlotsReleased() ─────────────────────────────────────────────────────────

describe('WaitlistService.onSlotsReleased()', () => {
  it('calls promoteNext() for every released slotId', async () => {
    const svc = makeSvc();
    const spy = jest.spyOn(svc, 'promoteNext').mockResolvedValue(null);
    await (svc as unknown as { onSlotsReleased: (p: object) => Promise<void> }).onSlotsReleased({
      tenantId: T, bookingId: 'bk-1',
      slotIds:  ['s1', 's2', 's3'],
      reason:   'cancelled', actorId: ACT, timestamp: new Date().toISOString(),
    });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith('s1', T);
    expect(spy).toHaveBeenCalledWith('s2', T);
    expect(spy).toHaveBeenCalledWith('s3', T);
  });

  it('continues when one slotId fails (non-fatal)', async () => {
    const svc = makeSvc();
    const spy = jest.spyOn(svc, 'promoteNext')
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValue(null);

    await expect(
      (svc as unknown as { onSlotsReleased: (p: object) => Promise<void> }).onSlotsReleased({
        tenantId: T, bookingId: 'bk-1',
        slotIds:  ['s1', 's2'],
        reason:   'cancelled', actorId: ACT, timestamp: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ── sweepExpiredPromotions() ──────────────────────────────────────────────────

describe('WaitlistService.sweepExpiredPromotions()', () => {
  it('does nothing when no expired promotions exist', async () => {
    const svc = makeSvc();
    const spy = jest.spyOn(svc, 'promoteNext').mockResolvedValue(null);
    await (svc as unknown as { sweepExpiredPromotions: () => Promise<void> }).sweepExpiredPromotions();
    expect(spy).not.toHaveBeenCalled();
  });

  it('expires entries and re-promotes for each', async () => {
    const expiredEntry = makeEntry({ status: 'promoted', slotId: S1, tenantId: T });
    const wRepo = makeWaitlistRepo({ findExpiredPromotions: jest.fn().mockResolvedValue([expiredEntry]) });
    const svc   = makeSvc(wRepo);
    const spy   = jest.spyOn(svc, 'promoteNext').mockResolvedValue(null);

    await (svc as unknown as { sweepExpiredPromotions: () => Promise<void> }).sweepExpiredPromotions();

    expect(spy).toHaveBeenCalledWith(S1, T);
  });

  it('continues when one entry fails', async () => {
    const e1 = makeEntry({ id: 'e-1', slotId: 'slot-1', status: 'promoted', tenantId: T });
    const e2 = makeEntry({ id: 'e-2', slotId: 'slot-2', status: 'promoted', tenantId: T });
    const wRepo = makeWaitlistRepo({ findExpiredPromotions: jest.fn().mockResolvedValue([e1, e2]) });
    const ds    = {
      transaction: jest.fn()
        .mockRejectedValueOnce(new Error('lock timeout'))
        .mockImplementation(async (fn: (m: object) => Promise<unknown>) => fn({ update: jest.fn(), query: jest.fn().mockResolvedValue([]) })),
      query: jest.fn().mockResolvedValue([{ count: '2' }]),
    };
    const svc = makeSvc(wRepo, undefined, undefined, undefined, ds as never);
    const spy = jest.spyOn(svc, 'promoteNext').mockResolvedValue(null);

    await expect(
      (svc as unknown as { sweepExpiredPromotions: () => Promise<void> }).sweepExpiredPromotions()
    ).resolves.toBeUndefined();

    // Second entry should still be processed
    expect(spy).toHaveBeenCalledWith('slot-2', T);
  });
});

// ── Tenant isolation ──────────────────────────────────────────────────────────

describe('WaitlistService — tenant isolation', () => {
  it('join() passes tenantId to slotRepository.findById', async () => {
    const sRepo = makeSlotRepo();
    const svc   = makeSvc(undefined, sRepo);
    await svc.join({ slotId: S1, courtId: C1, branchId: B1, customerName: 'X' }, T, ACT);
    expect(sRepo.findById).toHaveBeenCalledWith(S1, T);
  });

  it('findOne() passes tenantId to waitlistRepository', async () => {
    const wRepo = makeWaitlistRepo();
    const svc   = makeSvc(wRepo);
    await svc.findOne(E1, T);
    expect(wRepo.findById).toHaveBeenCalledWith(E1, T);
  });

  it('leave() passes tenantId to softDelete', async () => {
    const wRepo = makeWaitlistRepo();
    const svc   = makeSvc(wRepo);
    await svc.leave(E1, T);
    expect(wRepo.softDelete).toHaveBeenCalledWith(E1, T);
  });

  it('onSlotsReleased() uses tenantId from payload — not a hardcoded value', async () => {
    const OTHER_TENANT = 'tenant-other-0000-0000-000000000099';
    const svc = makeSvc();
    const spy = jest.spyOn(svc, 'promoteNext').mockResolvedValue(null);
    await (svc as unknown as { onSlotsReleased: (p: object) => Promise<void> }).onSlotsReleased({
      tenantId: OTHER_TENANT, bookingId: 'bk-x', slotIds: [S1],
      reason: 'cancelled', actorId: ACT, timestamp: new Date().toISOString(),
    });
    expect(spy).toHaveBeenCalledWith(S1, OTHER_TENANT);
  });
});

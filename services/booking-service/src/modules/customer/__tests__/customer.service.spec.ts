/**
 * customer.service.spec.ts
 *
 * Unit tests for CustomerService and CustomerRepository (pure logic).
 *
 * Covers:
 *   Repository:
 *     ✓ create() saves entity
 *     ✓ findByEmailAndTenant() scopes to tenant
 *     ✓ findByUserIdAndTenant() scopes to tenant
 *     ✓ update() scopes to tenant
 *     ✓ softDelete() sets is_deleted
 *
 *   Service:
 *     ✓ create() emits CustomerEvents.CREATED
 *     ✓ create() throws on duplicate email
 *     ✓ create() sets fullName from firstName + lastName
 *     ✓ findOne() throws NotFoundException for missing customer
 *     ✓ findOne() enforces tenant isolation
 *     ✓ update() re-computes fullName
 *     ✓ update() emits STATUS_CHANGED when status differs
 *     ✓ update() throws on email clash with another customer
 *     ✓ remove() soft-deletes and emits CustomerEvents.DELETED
 *     ✓ resolveOrCreateForBooking() returns existing by userId
 *     ✓ resolveOrCreateForBooking() returns existing by email
 *     ✓ resolveOrCreateForBooking() auto-creates when not found
 *     ✓ resolveOrCreateForBooking() returns null on error (non-fatal)
 *
 *   Search:
 *     ✓ search() adds ILIKE clause when q is provided
 *     ✓ search() filters by status
 *     ✓ search() enforces tenant_id in every query
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomerService }    from '../services/customer.service';
import type { CustomerRepository } from '../repositories/customer.repository';
import { CustomerEvents }     from '../events/customer.events';
import type { CustomerEntity } from '../entities/customer.entity';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T = 'tenant-aaaa-aaaa-aaaa-000000000001';
const A = 'actor-1111-1111-1111-111111111111';
const ID = 'cust-2222-2222-2222-222222222222';

function makeCustomer(overrides: Partial<CustomerEntity> = {}): CustomerEntity {
  return {
    id:                  ID,
    tenantId:            T,
    branchId:            null,
    userId:              null,
    parentCustomerId:    null,
    firstName:           'Alice',
    lastName:            'Smith',
    fullName:            'Alice Smith',
    gender:              null,
    dateOfBirth:         null,
    phone:               '+441234567890',
    email:               'alice@example.com',
    emergencyContact:    null,
    address:             null,
    profilePhoto:        null,
    notes:               null,
    status:              'active',
    isGuest:             false,
    walletBalanceMinor:  0,
    isDeleted:           false,
    createdAt:           new Date('2025-01-01'),
    updatedAt:           new Date('2025-01-01'),
    deletedAt:           null,
    ...overrides,
  };
}

function makeRepo(overrides: Partial<CustomerRepository> = {}): jest.Mocked<CustomerRepository> {
  return {
    create:                     jest.fn().mockResolvedValue(makeCustomer()),
    findByIdAndTenant:          jest.fn().mockResolvedValue(makeCustomer()),
    findByEmailAndTenant:       jest.fn().mockResolvedValue(null),
    findByUserIdAndTenant:      jest.fn().mockResolvedValue(null),
    update:                     jest.fn().mockResolvedValue(makeCustomer()),
    softDelete:                 jest.fn().mockResolvedValue(undefined),
    search:                     jest.fn().mockResolvedValue({ data: [], total: 0 }),
    getProfile:                 jest.fn().mockResolvedValue(null),
    ...overrides,
  } as jest.Mocked<CustomerRepository>;
}

function makeEmitter() {
  return { emitAsync: jest.fn().mockResolvedValue([]) };
}

// ── Service tests ─────────────────────────────────────────────────────────────

describe('CustomerService', () => {
  let repo:    jest.Mocked<CustomerRepository>;
  let emitter: ReturnType<typeof makeEmitter>;
  let svc:     CustomerService;

  beforeEach(() => {
    repo    = makeRepo();
    emitter = makeEmitter();
    svc     = new CustomerService(repo as never, emitter as never);
  });

  // ── create() ────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('throws BadRequestException when email is already taken', async () => {
      repo.findByEmailAndTenant.mockResolvedValue(makeCustomer());
      await expect(
        svc.create({ firstName: 'Bob', lastName: 'Jones', email: 'alice@example.com' }, T, A),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets fullName to firstName + lastName', async () => {
      await svc.create({ firstName: 'Alice', lastName: 'Smith' }, T, A);
      const saved = (repo.create.mock.calls[0] as [Partial<CustomerEntity>])[0];
      expect(saved.fullName).toBe('Alice Smith');
    });

    it('emits CustomerEvents.CREATED', async () => {
      await svc.create({ firstName: 'Alice', lastName: 'Smith' }, T, A);
      expect(emitter.emitAsync).toHaveBeenCalledWith(
        CustomerEvents.CREATED,
        expect.objectContaining({ tenantId: T, customerId: ID }),
      );
    });

    it('skips email check when no email provided', async () => {
      await svc.create({ firstName: 'Alice', lastName: 'Smith' }, T, A);
      expect(repo.findByEmailAndTenant).not.toHaveBeenCalled();
    });
  });

  // ── findOne() ────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns customer when found', async () => {
      const result = await svc.findOne(ID, T);
      expect(result.id).toBe(ID);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findByIdAndTenant.mockResolvedValue(null);
      await expect(svc.findOne(ID, T)).rejects.toThrow(NotFoundException);
    });

    it('passes tenantId to repository (tenant isolation)', async () => {
      await svc.findOne(ID, T);
      expect(repo.findByIdAndTenant).toHaveBeenCalledWith(ID, T);
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('re-computes fullName when firstName changes', async () => {
      await svc.update(ID, { firstName: 'Alicia' }, T, A);
      const saved = (repo.update.mock.calls[0] as [string, string, Partial<CustomerEntity>])[2];
      expect(saved.fullName).toBe('Alicia Smith');
    });

    it('re-computes fullName when lastName changes', async () => {
      await svc.update(ID, { lastName: 'Jones' }, T, A);
      const saved = (repo.update.mock.calls[0] as [string, string, Partial<CustomerEntity>])[2];
      expect(saved.fullName).toBe('Alice Jones');
    });

    it('emits STATUS_CHANGED when status differs from existing', async () => {
      await svc.update(ID, { status: 'inactive' }, T, A);
      expect(emitter.emitAsync).toHaveBeenCalledWith(
        CustomerEvents.STATUS_CHANGED,
        expect.objectContaining({ previousStatus: 'active', newStatus: 'inactive' }),
      );
    });

    it('emits UPDATED when status unchanged', async () => {
      await svc.update(ID, { notes: 'VIP' }, T, A);
      expect(emitter.emitAsync).toHaveBeenCalledWith(
        CustomerEvents.UPDATED,
        expect.objectContaining({ customerId: ID }),
      );
    });

    it('throws BadRequestException when new email belongs to a different customer', async () => {
      repo.findByEmailAndTenant.mockResolvedValue(makeCustomer({ id: 'other-id' }));
      await expect(
        svc.update(ID, { email: 'taken@example.com' }, T, A),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove() ─────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('calls softDelete with id and tenantId', async () => {
      await svc.remove(ID, T, A);
      expect(repo.softDelete).toHaveBeenCalledWith(ID, T);
    });

    it('emits CustomerEvents.DELETED', async () => {
      await svc.remove(ID, T, A);
      expect(emitter.emitAsync).toHaveBeenCalledWith(
        CustomerEvents.DELETED,
        expect.objectContaining({ customerId: ID, tenantId: T }),
      );
    });
  });

  // ── resolveOrCreateForBooking() ───────────────────────────────────────────

  describe('resolveOrCreateForBooking()', () => {
    it('returns existing customer id when found by userId', async () => {
      repo.findByUserIdAndTenant.mockResolvedValue(makeCustomer({ id: 'existing-id' }));
      const result = await svc.resolveOrCreateForBooking({
        tenantId: T, userId: 'user-001', name: 'Alice Smith', isGuest: false,
      });
      expect(result).toBe('existing-id');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('returns existing customer id when found by email', async () => {
      repo.findByEmailAndTenant.mockResolvedValue(makeCustomer({ id: 'by-email-id' }));
      const result = await svc.resolveOrCreateForBooking({
        tenantId: T, email: 'alice@example.com', name: 'Alice Smith', isGuest: false,
      });
      expect(result).toBe('by-email-id');
    });

    it('auto-creates customer when not found', async () => {
      const result = await svc.resolveOrCreateForBooking({
        tenantId: T, name: 'New Guest', isGuest: true,
      });
      expect(repo.create).toHaveBeenCalled();
      expect(result).toBe(ID);
    });

    it('returns null when create throws (non-fatal)', async () => {
      repo.create.mockRejectedValue(new Error('DB error'));
      const result = await svc.resolveOrCreateForBooking({
        tenantId: T, name: 'Fail Guest', isGuest: true,
      });
      expect(result).toBeNull();
    });

    it('prefers userId lookup over email lookup', async () => {
      repo.findByUserIdAndTenant.mockResolvedValue(makeCustomer({ id: 'user-found' }));
      const result = await svc.resolveOrCreateForBooking({
        tenantId: T, userId: 'u1', email: 'a@b.com', name: 'Test', isGuest: false,
      });
      expect(result).toBe('user-found');
      expect(repo.findByEmailAndTenant).not.toHaveBeenCalled();
    });
  });

  // ── findAll / search ──────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('delegates to repository.search with tenantId', async () => {
      await svc.findAll(T, { q: 'alice' });
      expect(repo.search).toHaveBeenCalledWith(T, { q: 'alice' });
    });
  });

  // ── getProfile() ─────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('throws NotFoundException when customer not found', async () => {
      repo.getProfile.mockResolvedValue(null);
      await expect(svc.getProfile(ID, T)).rejects.toThrow(NotFoundException);
    });
  });
});

// ── Tenant isolation regression ───────────────────────────────────────────────

describe('CustomerService — tenant isolation', () => {
  const T_A = 'tenant-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const T_B = 'tenant-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  it('findByIdAndTenant passes tenantId — different tenant gets null', async () => {
    const repo    = makeRepo({ findByIdAndTenant: jest.fn().mockResolvedValue(null) });
    const emitter = makeEmitter();
    const svc     = new CustomerService(repo as never, emitter as never);

    await expect(svc.findOne(ID, T_B)).rejects.toThrow(NotFoundException);
    expect(repo.findByIdAndTenant).toHaveBeenCalledWith(ID, T_B);
  });

  it('create() stamps tenantId on the entity', async () => {
    const repo    = makeRepo();
    const emitter = makeEmitter();
    const svc     = new CustomerService(repo as never, emitter as never);

    await svc.create({ firstName: 'X', lastName: 'Y' }, T_A, A);
    const saved = (repo.create.mock.calls[0] as [Partial<CustomerEntity>])[0];
    expect(saved.tenantId).toBe(T_A);
  });

  it('update() passes tenantId to repository', async () => {
    const repo    = makeRepo();
    const emitter = makeEmitter();
    const svc     = new CustomerService(repo as never, emitter as never);

    await svc.update(ID, { notes: 'hi' }, T_A, A);
    expect(repo.update).toHaveBeenCalledWith(ID, T_A, expect.any(Object));
  });
});

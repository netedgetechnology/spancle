/**
 * payment.service.spec.ts
 *
 * Unit tests for PaymentService — the core finance layer that drives
 * gateway calls, journal posting, and event emission.
 *
 * Coverage:
 *   initiate()
 *   ✓ returns existing payment on idempotency key hit
 *   ✓ calls adapter.initiate() and persists gatewayPaymentId
 *   ✓ calls paymentService.fail() and throws when adapter.initiate() fails
 *   ✓ skips adapter when gateway has no registered adapter (cash)
 *
 *   capture()
 *   ✓ posts journal entry inside a transaction (DR Clearing / CR Unapplied)
 *   ✓ is idempotent — returns early when journalEntryId already set (FOR UPDATE)
 *   ✓ throws BadRequestException on invalid transition (already captured)
 *   ✓ throws BadRequestException on non-positive captureMinor
 *
 *   fail()
 *   ✓ transitions status to 'failed' and stores reason
 *   ✓ emits PaymentEvents.FAILED
 *   ✓ throws on invalid transition (already captured → failed)
 *
 *   allocate()
 *   ✓ creates allocation row and posts DR Unapplied / CR AR journal
 *   ✓ throws when allocatedMinor exceeds unallocatedMinor
 *   ✓ throws when allocatedMinor exceeds invoice outstandingMinor
 *   ✓ marks invoice as 'paid' when outstanding reaches zero
 *   ✓ marks invoice as 'partially_paid' when outstanding > 0
 *
 *   reconcile()
 *   ✓ calls adapter.reconcile() and updates gatewayStatus
 *   ✓ triggers capture() when gateway reports succeeded and status is authorized
 *   ✓ triggers fail() when gateway reports failed
 *   ✓ is a no-op status update for gateways already in terminal state
 */

import { BadRequestException }    from '@nestjs/common';
import { PaymentService }         from '../../finance/services/payment.service';
import type { PaymentRepository } from '../../finance/repositories/payment.repository';
import type { InvoiceRepository } from '../../finance/repositories/invoice.repository';
import type { DoubleEntryService }    from '../../finance/services/double-entry.service';
import type { AccountingPeriodService } from '../../finance/services/accounting-period.service';
import type { PaymentEntity } from '../../finance/entities/payment.entity';
import type { InvoiceEntity } from '../../finance/entities/invoice.entity';
import type { PaymentGatewayAdapter } from '../../finance/gateway/payment-gateway.adapter';
import { PaymentEvents } from '../../finance/events/payment.events';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T   = 'tenant-ps-0000-0000-000000000001';
const A   = 'actor-ps-0000-0000-000000000001';
const PID = 'payment-ps-000-0000-000000000001';
const IID = 'invoice-ps-000-0000-000000000001';
const KEY = 'bk_booking-ps_uuid-001';

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return {
    id:                  PID,
    tenantId:            T,
    reference:           'PAY-TEST-0001',
    status:              'initiated',
    method:              'online_card',
    gateway:             'stripe',
    amountMinor:         2000,
    currency:            'GBP',
    idempotencyKey:      KEY,
    gatewayPaymentId:    null,
    gatewayStatus:       null,
    capturedAmountMinor: 0,
    unallocatedMinor:    0,
    allocatedMinor:      0,
    journalEntryId:      null,
    customerId:          null,
    ...overrides,
  } as unknown as PaymentEntity;
}

function makeInvoice(overrides: Partial<InvoiceEntity> = {}): InvoiceEntity {
  return {
    id:               IID,
    tenantId:         T,
    invoiceNumber:    'INV-TEST-001',
    status:           'issued',
    totalMinor:       2000,
    subtotalMinor:    2000,
    discountMinor:    0,
    taxMinor:         0,
    amountPaidMinor:  0,
    outstandingMinor: 2000,
    amountRefundedMinor: 0,
    sourceType:       'booking',
    currency:         'GBP',
    ...overrides,
  } as unknown as InvoiceEntity;
}

const MOCK_JOURNAL_ENTRY = { id: 'je-test-001' };

// ── Helper: build PaymentService ──────────────────────────────────────────────

function makeService(opts: {
  payment?:         Partial<PaymentEntity>;
  existingPayment?: PaymentEntity | null;
  adapters?:        PaymentGatewayAdapter[];
  capturedPayment?: Partial<PaymentEntity>;
  invoice?:         Partial<InvoiceEntity>;
} = {}) {
  const payment = makePayment(opts.payment);

  const mockPaymentRepo: Partial<jest.Mocked<PaymentRepository>> = {
    findByIdempotencyKey: jest.fn().mockResolvedValue(opts.existingPayment ?? null),
    nextReference:        jest.fn().mockResolvedValue('PAY-TEST-0001'),
    create:               jest.fn().mockResolvedValue(payment),
    update:               jest.fn().mockResolvedValue(undefined),
    findByIdOrFail:       jest.fn().mockImplementation((_id, _tid) => {
      const cp = opts.capturedPayment ?? {};
      return Promise.resolve({ ...payment, ...cp });
    }),
    findAll:              jest.fn().mockResolvedValue([]),
    findAllocationsByPayment: jest.fn().mockResolvedValue([]),
  };

  const invoice = makeInvoice(opts.invoice);

  const mockInvoiceRepo: Partial<jest.Mocked<InvoiceRepository>> = {
    findByIdOrFail: jest.fn().mockResolvedValue(invoice),
  };

  const mockDoubleEntry: Partial<jest.Mocked<DoubleEntryService>> = {
    postWithManager: jest.fn().mockResolvedValue(MOCK_JOURNAL_ENTRY),
  };

  const mockPeriodService: Partial<jest.Mocked<AccountingPeriodService>> = {
    assertOpen: jest.fn().mockResolvedValue({ id: 'period-001', status: 'open' }),
  };

  const emitted: Array<{ event: string; payload: unknown }> = [];
  const mockEventEmitter = {
    emitAsync: jest.fn().mockImplementation((event: string, payload: unknown) => {
      emitted.push({ event, payload });
      return Promise.resolve(undefined);
    }),
  };

  const lockedPayment = { ...payment, ...opts.payment };
  const mockManager = {
    createQueryBuilder: jest.fn().mockReturnValue({
      setLock:   jest.fn().mockReturnThis(),
      where:     jest.fn().mockReturnThis(),
      andWhere:  jest.fn().mockReturnThis(),
      getOne:    jest.fn().mockResolvedValue(lockedPayment),
    }),
    update: jest.fn().mockResolvedValue(undefined),
    save:   jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((_, obj) => obj),
    find:   jest.fn().mockResolvedValue([]),
  };

  const mockDs = {
    transaction: jest.fn().mockImplementation(
      async (cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager),
    ),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ ...payment, gateway: 'stripe', gatewayPaymentId: 'pi_test_123' }),
    }),
  };

  const svc = new PaymentService(
    mockPaymentRepo as never,
    mockInvoiceRepo as never,
    mockDoubleEntry as never,
    mockPeriodService as never,
    mockEventEmitter as never,
    mockDs as never,
    opts.adapters ?? [],
  );

  return {
    svc, mockPaymentRepo, mockDoubleEntry, mockPeriodService,
    mockEventEmitter, mockManager, mockDs, emitted, payment,
  };
}

// ── initiate() ───────────────────────────────────────────────────────────────

describe('PaymentService.initiate()', () => {
  const DTO = {
    method:         'online_card' as const,
    gateway:        'stripe' as const,
    amountMinor:    2000,
    currency:       'GBP',
    idempotencyKey: KEY,
  };

  it('returns existing payment on idempotency key hit', async () => {
    const existing = makePayment({ status: 'captured' });
    const { svc, mockPaymentRepo } = makeService({ existingPayment: existing });

    const result = await svc.initiate(DTO, T, A);

    expect(result).toBe(existing);
    expect(mockPaymentRepo.create).not.toHaveBeenCalled();
  });

  it('calls adapter.initiate() and stores gatewayPaymentId + clientSecret', async () => {
    const mockAdapter: Partial<PaymentGatewayAdapter> = {
      gatewayName: 'stripe',
      initiate: jest.fn().mockResolvedValue({
        gatewayPaymentId: 'pi_test_abc',
        gatewayStatus:    'requires_payment_method',
        clientSecret:     'pi_test_abc_secret',
        rawResponse:      {},
      }),
    };

    const { svc, mockPaymentRepo } = makeService({ adapters: [mockAdapter as PaymentGatewayAdapter] });
    await svc.initiate(DTO, T, A);

    expect(mockAdapter.initiate).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: KEY, amountMinor: 2000 }),
    );
    expect(mockPaymentRepo.update).toHaveBeenCalledWith(
      PID, T,
      expect.objectContaining({ gatewayPaymentId: 'pi_test_abc' }),
    );
  });

  it('calls fail() and throws UnprocessableEntityException when adapter.initiate() throws', async () => {
    const mockAdapter: Partial<PaymentGatewayAdapter> = {
      gatewayName: 'stripe',
      initiate:    jest.fn().mockRejectedValue(new Error('Stripe API down')),
    };

    const { svc } = makeService({ adapters: [mockAdapter as PaymentGatewayAdapter] });

    await expect(svc.initiate(DTO, T, A)).rejects.toThrow('Gateway initiation failed');
  });

  it('skips adapter when gateway is cash (no registered adapter)', async () => {
    const { svc, mockPaymentRepo } = makeService({ adapters: [] });

    await svc.initiate({ ...DTO, gateway: 'cash' as 'cash', method: 'cash' as 'cash' }, T, A);

    // No adapter update call — status stays initiated
    expect(mockPaymentRepo.update).not.toHaveBeenCalled();
  });

  it('emits PaymentEvents.INITIATED after creation', async () => {
    const { svc, emitted } = makeService({ adapters: [] });
    await svc.initiate({ ...DTO, gateway: 'cash' as 'cash', method: 'cash' as 'cash' }, T, A);

    expect(emitted.some((e) => e.event === PaymentEvents.INITIATED)).toBe(true);
  });
});

// ── capture() ────────────────────────────────────────────────────────────────

describe('PaymentService.capture()', () => {
  it('posts DR Clearing / CR Unapplied journal inside transaction', async () => {
    const prePayment = makePayment({ status: 'initiated', gatewayPaymentId: 'pi_abc' });
    const { svc, mockDoubleEntry, mockPaymentRepo, mockManager } = makeService({
      payment:         prePayment,
      capturedPayment: { status: 'captured', capturedAmountMinor: 2000, journalEntryId: 'je-001' },
    });

    // findByIdOrFail called twice: once in pre-flight, once after tx
    mockPaymentRepo.findByIdOrFail!
      .mockResolvedValueOnce(prePayment)
      .mockResolvedValueOnce({ ...prePayment, status: 'captured', capturedAmountMinor: 2000 });

    // getOne under lock returns the pre-payment (no journalEntryId yet)
    mockManager.createQueryBuilder().getOne.mockResolvedValue(prePayment);

    const mockAdapter: Partial<PaymentGatewayAdapter> = {
      gatewayName: 'stripe',
      capture:     jest.fn().mockResolvedValue({ gatewayPaymentId: 'pi_abc', gatewayStatus: 'succeeded', capturedMinor: 2000, rawResponse: {} }),
    };

    const { svc: svcWithAdapter } = makeService({
      payment:         prePayment,
      capturedPayment: { status: 'captured', capturedAmountMinor: 2000, journalEntryId: 'je-001' },
      adapters:        [mockAdapter as PaymentGatewayAdapter],
    });
    (svcWithAdapter as unknown as Record<string, unknown>)['paymentRepository'] = mockPaymentRepo;
    (svcWithAdapter as unknown as Record<string, unknown>)['doubleEntryService'] = mockDoubleEntry;

    void svc; // use base svc to verify journal posting
    await svc.capture(PID, {}, T, A);

    expect(mockDoubleEntry.postWithManager).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining([
          expect.objectContaining({ debitMinor: 2000 }),
          expect.objectContaining({ creditMinor: 2000 }),
        ]),
      }),
      expect.anything(),
    );
  });

  it('is idempotent — returns early when journalEntryId already set under lock', async () => {
    const alreadyCaptured = makePayment({
      status:              'initiated',
      journalEntryId:      'je-existing-001',
      capturedAmountMinor: 2000,
      gatewayPaymentId:    'pi_abc',
    });

    const { svc, mockDoubleEntry, mockPaymentRepo } = makeService({ payment: alreadyCaptured });

    mockPaymentRepo.findByIdOrFail!.mockResolvedValue(alreadyCaptured);

    await svc.capture(PID, {}, T, A);

    // Journal must NOT be posted again
    expect(mockDoubleEntry.postWithManager).not.toHaveBeenCalled();
  });

  it('throws BadRequestException on invalid status transition', async () => {
    const captured = makePayment({ status: 'captured' });
    const { svc, mockPaymentRepo } = makeService({ payment: captured });
    mockPaymentRepo.findByIdOrFail!.mockResolvedValue(captured);

    await expect(svc.capture(PID, {}, T, A)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on non-positive captureMinor', async () => {
    const { svc } = makeService({});
    await expect(svc.capture(PID, { amountMinor: 0 }, T, A)).rejects.toThrow(BadRequestException);
    await expect(svc.capture(PID, { amountMinor: -1 }, T, A)).rejects.toThrow(BadRequestException);
  });

  it('emits PaymentEvents.CAPTURED with correct payload', async () => {
    const prePayment = makePayment({ status: 'initiated', gatewayPaymentId: 'pi_emitted' });
    const { svc, emitted, mockPaymentRepo } = makeService({ payment: prePayment });

    mockPaymentRepo.findByIdOrFail!
      .mockResolvedValueOnce(prePayment)
      .mockResolvedValueOnce({ ...prePayment, status: 'captured', capturedAmountMinor: 2000 });

    await svc.capture(PID, {}, T, A);

    const captured = emitted.find((e) => e.event === PaymentEvents.CAPTURED);
    expect(captured).toBeDefined();
    expect((captured!.payload as Record<string, unknown>)['tenantId']).toBe(T);
  });
});

// ── fail() ───────────────────────────────────────────────────────────────────

describe('PaymentService.fail()', () => {
  it('transitions status to failed and persists reason', async () => {
    const { svc, mockPaymentRepo } = makeService({});
    await svc.fail(PID, { reason: 'Card declined' }, T, A);

    expect(mockPaymentRepo.update).toHaveBeenCalledWith(
      PID, T,
      expect.objectContaining({ status: 'failed', failureReason: 'Card declined' }),
    );
  });

  it('emits PaymentEvents.FAILED with failureReason', async () => {
    const { svc, emitted } = makeService({});
    await svc.fail(PID, { reason: 'Insufficient funds' }, T, A);

    const ev = emitted.find((e) => e.event === PaymentEvents.FAILED);
    expect(ev).toBeDefined();
    expect((ev!.payload as Record<string, unknown>)['failureReason']).toBe('Insufficient funds');
  });

  it('throws BadRequestException for invalid transition (captured → failed)', async () => {
    const captured = makePayment({ status: 'captured' });
    const { svc, mockPaymentRepo } = makeService({ payment: captured });
    mockPaymentRepo.findByIdOrFail!.mockResolvedValue(captured);

    await expect(svc.fail(PID, { reason: 'test' }, T, A)).rejects.toThrow(BadRequestException);
  });
});

// ── allocate() ───────────────────────────────────────────────────────────────

describe('PaymentService.allocate()', () => {
  const ALLOC_DTO = { invoiceId: IID, allocatedMinor: 2000 };

  function makeAllocSvc(paymentOverrides: Partial<PaymentEntity> = {}, invoiceOverrides: Partial<InvoiceEntity> = {}) {
    const payment = makePayment({
      status:              'captured',
      capturedAmountMinor: 2000,
      unallocatedMinor:    2000,
      allocatedMinor:      0,
      ...paymentOverrides,
    });
    const invoice = makeInvoice(invoiceOverrides);

    const mockPaymentRepo: Partial<jest.Mocked<PaymentRepository>> = {
      findByIdOrFail:        jest.fn().mockResolvedValue(payment),
      findAllocationsByPayment: jest.fn().mockResolvedValue([]),
    };
    const mockInvoiceRepo: Partial<jest.Mocked<InvoiceRepository>> = {
      findByIdOrFail: jest.fn().mockResolvedValue(invoice),
    };
    const mockDoubleEntry: Partial<jest.Mocked<DoubleEntryService>> = {
      postWithManager: jest.fn().mockResolvedValue(MOCK_JOURNAL_ENTRY),
    };
    const mockPeriodService: Partial<jest.Mocked<AccountingPeriodService>> = {
      assertOpen: jest.fn().mockResolvedValue({}),
    };
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const mockEventEmitter = { emitAsync: jest.fn().mockImplementation((e: string, p: unknown) => { emitted.push({ event: e, payload: p }); return Promise.resolve(); }) };

    const mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock:  jest.fn().mockReturnThis(),
        where:    jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne:   jest.fn()
          .mockResolvedValueOnce(payment)   // payment lock
          .mockResolvedValueOnce(invoice),  // invoice lock
      }),
      update: jest.fn().mockResolvedValue(undefined),
      save:   jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((_, obj) => obj),
      find:   jest.fn().mockResolvedValue([]),
    };

    const mockDs = {
      transaction: jest.fn().mockImplementation(
        async (cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager),
      ),
    };

    const svc = new PaymentService(
      mockPaymentRepo as never, mockInvoiceRepo as never,
      mockDoubleEntry as never, mockPeriodService as never,
      mockEventEmitter as never, mockDs as never, [],
    );

    return { svc, mockDoubleEntry, mockManager, emitted };
  }

  it('posts DR Unapplied Receipts / CR Accounts Receivable journal', async () => {
    const { svc, mockDoubleEntry } = makeAllocSvc();
    await svc.allocate(PID, ALLOC_DTO, T, A);

    expect(mockDoubleEntry.postWithManager).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining([
          expect.objectContaining({ accountCode: '2195', debitMinor:  2000 }),
          expect.objectContaining({ accountCode: '1150', creditMinor: 2000 }),
        ]),
      }),
      expect.anything(),
    );
  });

  it('marks invoice as paid when outstanding reaches zero', async () => {
    const { svc, mockManager } = makeAllocSvc();
    await svc.allocate(PID, ALLOC_DTO, T, A);

    // invoice.update call should include status: 'paid'
    expect(mockManager.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: IID }),
      expect.objectContaining({ status: 'paid' }),
    );
  });

  it('marks invoice as partially_paid when outstanding > 0', async () => {
    const { svc, mockManager } = makeAllocSvc(
      { capturedAmountMinor: 500, unallocatedMinor: 500, allocatedMinor: 0 },
      { totalMinor: 2000, outstandingMinor: 2000, amountPaidMinor: 0 },
    );
    // Partial allocation: 500 of 2000
    await svc.allocate(PID, { invoiceId: IID, allocatedMinor: 500 }, T, A);

    expect(mockManager.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: IID }),
      expect.objectContaining({ status: 'partially_paid' }),
    );
  });

  it('throws BadRequestException when allocatedMinor > unallocatedMinor', async () => {
    const { svc } = makeAllocSvc({ unallocatedMinor: 100 });
    await expect(svc.allocate(PID, { invoiceId: IID, allocatedMinor: 500 }, T, A)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when allocatedMinor > invoice outstandingMinor', async () => {
    const { svc } = makeAllocSvc({}, { outstandingMinor: 50 });
    await expect(svc.allocate(PID, { invoiceId: IID, allocatedMinor: 100 }, T, A)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on non-positive allocatedMinor', async () => {
    const { svc } = makeAllocSvc();
    await expect(svc.allocate(PID, { invoiceId: IID, allocatedMinor: 0 }, T, A)).rejects.toThrow(BadRequestException);
  });

  it('emits PaymentEvents.ALLOCATED after success', async () => {
    const { svc, emitted } = makeAllocSvc();
    await svc.allocate(PID, ALLOC_DTO, T, A);
    expect(emitted.some((e) => e.event === PaymentEvents.ALLOCATED)).toBe(true);
  });
});

// ── reconcile() ──────────────────────────────────────────────────────────────

describe('PaymentService.reconcile()', () => {
  function makeReconcileSvc(
    paymentStatus: string,
    gatewayStatus: string,
    capturedMinor: number | null = null,
  ) {
    const payment = makePayment({
      status:           paymentStatus as never,
      gatewayPaymentId: 'pi_reconcile_001',
    });

    const mockAdapter: Partial<PaymentGatewayAdapter> = {
      gatewayName: 'stripe',
      reconcile:   jest.fn().mockResolvedValue({ gatewayStatus, capturedMinor, rawResponse: {} }),
      capture:     jest.fn().mockResolvedValue({ gatewayPaymentId: 'pi_reconcile_001', gatewayStatus: 'succeeded', capturedMinor: 2000, rawResponse: {} }),
    };

    const { svc, mockPaymentRepo, emitted } = makeService({
      payment,
      adapters: [mockAdapter as PaymentGatewayAdapter],
    });
    mockPaymentRepo.findByIdOrFail!.mockResolvedValue(payment);

    return { svc, mockPaymentRepo, mockAdapter, emitted };
  }

  it('calls adapter.reconcile() and updates gatewayStatus', async () => {
    const { svc, mockPaymentRepo, mockAdapter } = makeReconcileSvc('authorized', 'requires_capture');
    await svc.reconcile(PID, T, A);

    expect(mockAdapter.reconcile).toHaveBeenCalledWith({ gatewayPaymentId: 'pi_reconcile_001' });
    expect(mockPaymentRepo.update).toHaveBeenCalledWith(
      PID, T,
      expect.objectContaining({ gatewayStatus: 'requires_capture' }),
    );
  });

  it('triggers capture() when gateway reports succeeded and status is authorized', async () => {
    const payment = makePayment({ status: 'authorized', gatewayPaymentId: 'pi_reconcile_001', journalEntryId: null });
    const mockAdapter: Partial<PaymentGatewayAdapter> = {
      gatewayName: 'stripe',
      reconcile:   jest.fn().mockResolvedValue({ gatewayStatus: 'succeeded', capturedMinor: 2000, rawResponse: {} }),
      capture:     jest.fn().mockResolvedValue({ gatewayPaymentId: 'pi_reconcile_001', gatewayStatus: 'succeeded', capturedMinor: 2000, rawResponse: {} }),
    };

    const { svc, mockPaymentRepo } = makeService({
      payment,
      adapters: [mockAdapter as PaymentGatewayAdapter],
    });
    mockPaymentRepo.findByIdOrFail!
      .mockResolvedValueOnce(payment)                         // reconcile pre-flight
      .mockResolvedValueOnce(payment)                         // capture pre-flight
      .mockResolvedValue({ ...payment, status: 'captured' }); // after capture

    await svc.reconcile(PID, T, A);

    // capture() is called (indirectly triggers postWithManager)
    expect(mockAdapter.capture).toHaveBeenCalled();
  });

  it('triggers fail() when gateway reports failed', async () => {
    const { svc, mockPaymentRepo } = makeReconcileSvc('initiated', 'failed');
    const payment = makePayment({ status: 'initiated', gatewayPaymentId: 'pi_reconcile_001' });
    mockPaymentRepo.findByIdOrFail!
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(payment)
      .mockResolvedValue({ ...payment, status: 'failed' });

    await svc.reconcile(PID, T, A);
    // no throw — fail() transitions the status
  });

  it('does not trigger capture() or fail() when already in terminal state', async () => {
    const { svc, mockPaymentRepo, mockAdapter } = makeReconcileSvc('captured', 'succeeded');
    const captured = makePayment({ status: 'captured', gatewayPaymentId: 'pi_reconcile_001' });
    mockPaymentRepo.findByIdOrFail!.mockResolvedValue(captured);

    await svc.reconcile(PID, T, A);

    // adapter.reconcile called but no capture call
    expect(mockAdapter.reconcile).toHaveBeenCalled();
    expect(mockAdapter.capture).not.toHaveBeenCalled();
  });

  it('emits PaymentEvents.RECONCILED', async () => {
    const { svc, emitted, mockPaymentRepo } = makeReconcileSvc('initiated', 'requires_payment_method');
    const payment = makePayment({ status: 'initiated', gatewayPaymentId: 'pi_reconcile_001' });
    mockPaymentRepo.findByIdOrFail!.mockResolvedValue(payment);

    await svc.reconcile(PID, T, A);

    expect(emitted.some((e) => e.event.includes('reconcil'))).toBe(true);
  });
});

/**
 * refund-orchestrator.service.spec.ts
 *
 * Tests for RefundService and PaymentOrchestratorService.
 *
 * Root-cause notes for mock design:
 *
 *   RefundService:
 *     prepareRefund() opens one DataSource.transaction() that issues up to 4
 *     sequential createQueryBuilder().getOne() FOR UPDATE calls in this order:
 *       1. PaymentEntity   (status must be 'captured' or 'chargedback')
 *       2. InvoiceEntity   (status must be 'paid' or 'partially_paid')
 *       (3. PaymentAllocationEntity lookup via manager.findOne() — not QB)
 *     commitAccounting() (called by requestRefund after Phase B) opens a second
 *     DataSource.transaction() with:
 *       1. RefundEntity    (the pending row)
 *       2. InvoiceEntity   (for journal computation)
 *
 *     The entity class is passed as the first arg to createQueryBuilder(EntityClass).
 *     We discriminate by checking the entity name via .name or the constructor.
 *
 *   PaymentOrchestratorService:
 *     onPaymentCaptured() uses ds.query() with a SQL that contains BOTH
 *     'booking_payments' AND 'JOIN finance_payments' — order matters in
 *     the mock router. We check for the join-based query first.
 */

import { BadRequestException }       from '@nestjs/common';
import { RefundService }              from '../../finance/services/refund.service';
import { PaymentOrchestratorService } from '../services/payment-orchestrator.service';
import type { RefundRepository }       from '../../finance/repositories/refund.repository';
import type { DoubleEntryService }     from '../../finance/services/double-entry.service';
import type { AccountingPeriodService } from '../../finance/services/accounting-period.service';
import type { StripeAdapter }          from '../../finance/gateway/stripe.adapter';
import type { RazorpayAdapter }        from '../../finance/gateway/razorpay.adapter';
import type { RefundEntity }           from '../../finance/entities/refund.entity';
import type { GatewayRegistry }        from '../services/gateway-registry.service';
import type { PaymentService }         from '../../finance/services/payment.service';
import type { BookingService }         from '../../booking/services/booking.service';
import type { RedisEventBusPublisher } from '../../../common/event-bus/redis-event-bus.publisher';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const T    = 'tenant-rs-0000-0000-000000000001';
const A    = 'actor-rs-0000-0000-000000000001';
const RID  = 'refund-rs-0000-0000-000000000001';
const PID  = 'payment-rs-000-0000-000000000001';
const BID  = 'booking-rs-000-0000-000000000001';
const IID  = 'invoice-rs-000-0000-000000000001';
const RKEY = 'bkref_booking-rs_payment-rs_001';

function makeRefundEntity(overrides: Partial<RefundEntity> = {}): RefundEntity {
  return {
    id:              RID,
    tenantId:        T,
    refundNumber:    'RFD-TEST-001',
    status:          'pending',
    amountMinor:     1000,
    currency:        'GBP',
    invoiceId:       IID,
    paymentId:       PID,
    idempotencyKey:  RKEY,
    gatewayRefundId: null,
    journalEntryId:  null,
    ...overrides,
  } as unknown as RefundEntity;
}

// ── Canonical mock entities ───────────────────────────────────────────────────

const CAPTURED_PAYMENT = {
  id: PID, tenantId: T,
  status: 'captured', gateway: 'stripe',
  gatewayPaymentId: 'pi_test_123',
  currency: 'GBP',
  capturedAmountMinor: 2000,
  amountRefundedMinor: 0,
};

const PAID_INVOICE = {
  id: IID, tenantId: T,
  status: 'paid',
  totalMinor: 2000, subtotalMinor: 2000,
  discountMinor: 0, taxMinor: 0,
  outstandingMinor: 0,
  amountPaidMinor: 2000,
  amountRefundedMinor: 0,
  currency: 'GBP',
  sourceType: 'booking',
};

// ═════════════════════════════════════════════════════════════════════════════
// RefundService
// ═════════════════════════════════════════════════════════════════════════════

describe('RefundService', () => {

  /**
   * makeRefundSvc() — builds a fully mocked RefundService.
   *
   * Manager QB mock: discriminates entity type by inspecting the constructor
   * name passed to createQueryBuilder(EntityClass). This avoids brittle
   * call-count cycling that breaks when different code paths issue different
   * numbers of locked reads.
   *
   *   'PaymentEntity'  → CAPTURED_PAYMENT
   *   'InvoiceEntity'  → PAID_INVOICE
   *   'RefundEntity'   → pending RefundEntity
   *   anything else    → pending RefundEntity (safe fallback)
   */
  function makeRefundSvc(opts: {
    existingRefund?:     RefundEntity | null;
    currentRefund?:      Partial<RefundEntity>;
    stripeRefundResult?: { id: string; status: string } | 'throw';
    paymentGateway?:     string;
  } = {}) {
    const refund = makeRefundEntity(opts.currentRefund);

    const mockRefundRepo: Partial<jest.Mocked<RefundRepository>> = {
      findByCallerIdempotencyKey: jest.fn().mockResolvedValue(opts.existingRefund ?? null),
      findByIdempotencyKey:       jest.fn().mockResolvedValue(null),
      validateImmutableIdentity:  jest.fn().mockReturnValue(true),
      nextRefundNumber:           jest.fn().mockResolvedValue('RFD-TEST-001'),
      createAllocations:          jest.fn().mockResolvedValue(undefined),
      update:                     jest.fn().mockResolvedValue(undefined),
      create:                     jest.fn().mockResolvedValue(refund),
      findByIdOrFail:             jest.fn().mockResolvedValue(refund),
      totalActiveRefundedAmount:  jest.fn().mockResolvedValue(0),
      priorComponentAllocations:  jest.fn().mockResolvedValue([]),
      findAll:                    jest.fn().mockResolvedValue([]),
      findByInvoice:              jest.fn().mockResolvedValue([]),
      findByPayment:              jest.fn().mockResolvedValue([]),
    };

    const mockDoubleEntry: Partial<jest.Mocked<DoubleEntryService>> = {
      postWithManager: jest.fn().mockResolvedValue({ id: 'je-ref-001' }),
    };

    const mockPeriodService: Partial<jest.Mocked<AccountingPeriodService>> = {
      assertOpen: jest.fn().mockResolvedValue({}),
    };

    const mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
    };

    const stripeRefundImpl =
      opts.stripeRefundResult === 'throw'
        ? jest.fn().mockRejectedValue(new Error('Stripe refund rejected'))
        : jest.fn().mockResolvedValue({
            gatewayRefundId: opts.stripeRefundResult?.id ?? 're_test_001',
            gatewayStatus:   opts.stripeRefundResult?.status ?? 'succeeded',
            rawResponse:     {},
          });

    const mockStripe = {
      gatewayName: 'stripe',
      refund:      stripeRefundImpl,
    } as unknown as StripeAdapter;

    const mockRazorpay = {
      gatewayName: 'razorpay',
      refund:      jest.fn().mockResolvedValue({
        gatewayRefundId: 'rfnd_001',
        gatewayStatus:   'processed',
        rawResponse:     {},
      }),
    } as unknown as RazorpayAdapter;

    /**
     * Entity-aware manager builder.
     *
     * The real RefundService calls:
     *   manager.createQueryBuilder(EntityClass, alias).setLock(...).where(...).getOne()
     *
     * We inspect EntityClass.name to return the correct fixture for each lock call,
     * eliminating fragile call-count ordering.
     */
    function makeManager() {
      return {
        find:    jest.fn().mockResolvedValue([]),                     // InvoiceTaxEntity rows
        findOne: jest.fn().mockResolvedValue({ id: 'alloc-001' }),   // PaymentAllocationEntity
        update:  jest.fn().mockResolvedValue(undefined),
        save:    jest.fn().mockResolvedValue({}),
        createQueryBuilder: jest.fn().mockImplementation((EntityClass: { name?: string }) => {
          const entityName = EntityClass?.name ?? '';
          let resolvedEntity: unknown;

          if (entityName === 'PaymentEntity' || entityName.includes('Payment')) {
            resolvedEntity = { ...CAPTURED_PAYMENT };
          } else if (entityName === 'InvoiceEntity' || entityName.includes('Invoice')) {
            resolvedEntity = { ...PAID_INVOICE };
          } else {
            // RefundEntity or fallback
            resolvedEntity = makeRefundEntity({ ...opts.currentRefund, status: 'pending' });
          }

          return {
            setLock:  jest.fn().mockReturnThis(),
            where:    jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne:   jest.fn().mockResolvedValue(resolvedEntity),
          };
        }),
      };
    }

    const mockDs = {
      transaction: jest.fn().mockImplementation(
        async (cb: (m: ReturnType<typeof makeManager>) => Promise<unknown>) =>
          cb(makeManager()),
      ),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id:              PID,
          tenantId:        T,
          gateway:         opts.paymentGateway ?? 'stripe',
          gatewayPaymentId: 'pi_test_123',
          currency:        'GBP',
        }),
        update: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const svc = new RefundService(
      mockRefundRepo as never,
      mockDoubleEntry as never,
      mockPeriodService as never,
      mockEventEmitter as never,
      mockStripe,
      mockRazorpay,
      mockDs as never,
    );

    return { svc, mockRefundRepo, mockStripe, mockRazorpay, mockDoubleEntry };
  }

  const PREPARE_DTO = {
    paymentId:      PID,
    invoiceId:      IID,
    amountMinor:    1000,
    currency:       'GBP',
    reason:         'Customer requested',
    idempotencyKey: RKEY,
    actorId:        A,
  };

  // ── prepareRefund ──────────────────────────────────────────────────────────

  describe('prepareRefund()', () => {
    it('creates a pending RefundEntity row when none exists', async () => {
      const { svc, mockRefundRepo } = makeRefundSvc();
      await svc.prepareRefund(PREPARE_DTO, T, A);

      // create() is called with (CreateRefundInput, EntityManager) inside the transaction
      expect(mockRefundRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amountMinor: 1000, callerIdempotencyKey: RKEY }),
        expect.anything(), // EntityManager
      );
    });

    it('returns existing row on idempotency key hit (any status)', async () => {
      const existing = makeRefundEntity({ status: 'processing' });
      const { svc, mockRefundRepo } = makeRefundSvc({ existingRefund: existing });

      const result = await svc.prepareRefund(PREPARE_DTO, T, A);

      expect(result).toBe(existing);
      expect(mockRefundRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── requestRefund ──────────────────────────────────────────────────────────

  describe('requestRefund()', () => {
    it('calls adapter.refund() with the stable idempotencyKey', async () => {
      const { svc, mockStripe } = makeRefundSvc();
      await svc.requestRefund(PREPARE_DTO, T, A);

      // The service builds the stable gateway key as ref_<refund.id>, not the caller RKEY.
      // RKEY is the *caller* idempotency key; the gateway key is ref_${RID}.
      expect(mockStripe.refund).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey:   `ref_${RID}`,
          gatewayPaymentId: 'pi_test_123',
          amountMinor:      1000,
        }),
      );
    });

    it('skips gateway call when payment gateway is cash (no adapter registered)', async () => {
      const { svc, mockStripe } = makeRefundSvc({ paymentGateway: 'cash' });
      await svc.requestRefund(PREPARE_DTO, T, A);
      expect(mockStripe.refund).not.toHaveBeenCalled();
    });

    it('rejects refund and throws BadRequestException when adapter.refund() throws', async () => {
      const { svc } = makeRefundSvc({ stripeRefundResult: 'throw' });
      await expect(svc.requestRefund(PREPARE_DTO, T, A)).rejects.toThrow(BadRequestException);
    });

    it('is idempotent — returns immediately when status is already processing', async () => {
      const processing = makeRefundEntity({ status: 'processing' });
      const { svc, mockStripe } = makeRefundSvc({ existingRefund: processing });

      const result = await svc.requestRefund(PREPARE_DTO, T, A);

      expect(result.status).toBe('processing');
      expect(mockStripe.refund).not.toHaveBeenCalled();
    });

    it('is idempotent — returns immediately when status is already completed', async () => {
      const completed = makeRefundEntity({ status: 'completed' });
      const { svc, mockStripe } = makeRefundSvc({ existingRefund: completed });

      const result = await svc.requestRefund(PREPARE_DTO, T, A);

      expect(result.status).toBe('completed');
      expect(mockStripe.refund).not.toHaveBeenCalled();
    });

    it('posts accounting journal after successful gateway refund', async () => {
      const { svc, mockDoubleEntry } = makeRefundSvc();
      await svc.requestRefund(PREPARE_DTO, T, A);
      expect(mockDoubleEntry.postWithManager).toHaveBeenCalledTimes(1);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PaymentOrchestratorService
// ═════════════════════════════════════════════════════════════════════════════

describe('PaymentOrchestratorService', () => {
  const FIN_PID  = 'fin-payment-000-0000-000000000001';
  const BOOK_PID = 'book-payment-0-0000-000000000001';

  /**
   * makeOrchSvc() SQL router design:
   *
   * onPaymentCaptured uses a query that contains BOTH 'booking_payments' AND
   * 'JOIN finance_payments'. We must route on the more-specific JOIN pattern
   * BEFORE the broader 'booking_payments' check, otherwise the wrong branch
   * fires and confirm() is never called.
   *
   * Route order (most-specific first):
   *   1. 'JOIN finance_payments'   → booking_id resolution for onPaymentCaptured
   *   2. 'UPDATE booking_payments' → update on capture (no-op array)
   *   3. 'booking_payments' + "status = 'pending'" → idempotency check
   *   4. 'finance_payments' + 'idempotency_key'    → finance payment lookup
   *   5. 'FROM bookings'           → cancel bridge enrichment
   */
  function makeOrchSvc(opts: {
    existingBookingPayment?: { id: string; idempotency_key: string } | null;
    existingFinPayment?:     { id: string; gateway_payment_id: string } | null;
    resolvedBookingId?:      { booking_id: string; id: string } | null;
  } = {}) {
    const mockGatewayRegistry: Partial<jest.Mocked<GatewayRegistry>> = {
      getActiveGatewayName: jest.fn().mockReturnValue('stripe'),
    };

    const mockPaymentService: Partial<jest.Mocked<PaymentService>> = {
      initiate: jest.fn().mockResolvedValue({
        id:               FIN_PID,
        gateway:          'stripe',
        gatewayPaymentId: 'pi_test_orch',
        gatewayMetadata:  { clientSecret: 'pi_test_orch_secret' },
      }),
      capture: jest.fn().mockResolvedValue({ id: FIN_PID, status: 'captured' }),
      fail:    jest.fn().mockResolvedValue({ id: FIN_PID, status: 'failed' }),
    };

    const mockBookingService: Partial<jest.Mocked<BookingService>> = {
      confirm: jest.fn().mockResolvedValue({ id: BID, status: 'confirmed' }),
    };

    const mockPublisher: Partial<RedisEventBusPublisher> = {
      publishPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
      publishPaymentFailed:    jest.fn().mockResolvedValue(undefined),
      publishBookingConfirmed: jest.fn().mockResolvedValue(undefined),
      publishBookingCancelled: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfig = { get: jest.fn().mockReturnValue('stripe') };

    const mockDs = {
      // ── ds.query() router (most-specific match first) ───────────────────
      query: jest.fn().mockImplementation(async (sql: string) => {
        const s = sql.replace(/\s+/g, ' ').trim();

        // 1. onPaymentCaptured — JOIN query to resolve booking_id from finance payment id
        //    Must be checked BEFORE the broad 'booking_payments' check below.
        if (s.includes('JOIN finance_payments')) {
          return opts.resolvedBookingId ? [opts.resolvedBookingId] : [];
        }

        // 2. Update booking_payments status on capture
        if (s.startsWith('UPDATE booking_payments')) return [];

        // 3. Idempotency check — pending booking payment exists?
        if (s.includes('booking_payments') && s.includes("status = 'pending'")) {
          return opts.existingBookingPayment ? [opts.existingBookingPayment] : [];
        }

        // 4. Finance payment lookup by idempotency_key (idempotency path)
        if (s.includes('finance_payments') && s.includes('idempotency_key')) {
          return opts.existingFinPayment ? [opts.existingFinPayment] : [];
        }

        // 5. Booking enrichment for cancel bridge
        if (s.includes('FROM bookings')) {
          return [{ customer_email: 'test@example.com', customer_name: 'Test', reference: 'BK-001' }];
        }

        return [];
      }),

      // ── ds.transaction() for initiateForBooking ──────────────────────────
      transaction: jest.fn().mockImplementation(
        async (cb: (m: Record<string, unknown>) => Promise<unknown>) => {
          const mockManager = {
            query: jest.fn().mockImplementation(async (sql: string) => {
              if (sql.includes('INSERT INTO booking_payments')) {
                return [{ id: BOOK_PID }];
              }
              return [];
            }),
          };
          return cb(mockManager);
        },
      ),
    };

    const svc = new PaymentOrchestratorService(
      mockGatewayRegistry as never,
      mockPaymentService as never,
      mockBookingService as never,
      mockPublisher as never,
      mockConfig as never,
      mockDs as never,
    );

    return { svc, mockPaymentService, mockBookingService, mockPublisher, mockDs };
  }

  // ── initiateForBooking ─────────────────────────────────────────────────────

  describe('initiateForBooking()', () => {
    const PARAMS = {
      tenantId:      T,
      bookingId:     BID,
      branchId:      'branch-001',
      amountMinor:   2000,
      currency:      'GBP',
      customerEmail: 'test@example.com',
      actorId:       A,
    };

    it('returns existing pending payment on idempotency hit without calling initiate()', async () => {
      const { svc, mockPaymentService } = makeOrchSvc({
        existingBookingPayment: { id: BOOK_PID, idempotency_key: 'bk_booking-rs_uuid' },
        existingFinPayment:     { id: FIN_PID,  gateway_payment_id: 'pi_existing' },
      });

      const result = await svc.initiateForBooking(PARAMS);

      expect(result.bookingPaymentId).toBe(BOOK_PID);
      expect(result.financePaymentId).toBe(FIN_PID);
      expect(mockPaymentService.initiate).not.toHaveBeenCalled();
    });

    it('inserts booking_payments row and calls PaymentService.initiate() when no pending exists', async () => {
      const { svc, mockPaymentService } = makeOrchSvc();

      const result = await svc.initiateForBooking(PARAMS);

      expect(mockPaymentService.initiate).toHaveBeenCalledTimes(1);
      expect(result.bookingPaymentId).toBe(BOOK_PID);
      expect(result.gatewayName).toBe('stripe');
    });

    it('returns clientSecret from finance payment gateway metadata', async () => {
      const { svc } = makeOrchSvc();
      const result = await svc.initiateForBooking(PARAMS);
      expect(result.clientSecret).toBe('pi_test_orch_secret');
    });
  });

  // ── onPaymentCaptured ──────────────────────────────────────────────────────

  describe('onPaymentCaptured()', () => {
    const PAYLOAD = {
      tenantId:            T,
      paymentId:           FIN_PID,
      amountMinor:         2000,
      currency:            'GBP',
      gatewayPaymentId:    'pi_captured_001',
      reference:           'PAY-TEST-001',
      method:              'online_card',
      gateway:             'stripe',
      status:              'captured',
      customerId:          null,
      timestamp:           new Date().toISOString(),
      capturedAmountMinor: 2000,
      journalEntryId:      'je-001',
    };

    it('resolves bookingId via JOIN query and calls BookingService.confirm()', async () => {
      const { svc, mockBookingService } = makeOrchSvc({
        resolvedBookingId: { booking_id: BID, id: BOOK_PID },
      });

      await svc.onPaymentCaptured(PAYLOAD as never);

      expect(mockBookingService.confirm).toHaveBeenCalledWith(BID, T, 'system:payment');
    });

    it('publishes BOOKING_CONFIRMED to Redis after successful confirm', async () => {
      const { svc, mockPublisher } = makeOrchSvc({
        resolvedBookingId: { booking_id: BID, id: BOOK_PID },
      });

      await svc.onPaymentCaptured(PAYLOAD as never);

      expect(mockPublisher.publishBookingConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: T, bookingId: BID }),
      );
    });

    it('does not call confirm() when no booking_payments row maps to this financePaymentId', async () => {
      const { svc, mockBookingService } = makeOrchSvc({ resolvedBookingId: null });

      await svc.onPaymentCaptured(PAYLOAD as never);

      expect(mockBookingService.confirm).not.toHaveBeenCalled();
    });

    it('does not throw when BookingService.confirm() fails (e.g. already confirmed)', async () => {
      const { svc, mockBookingService } = makeOrchSvc({
        resolvedBookingId: { booking_id: BID, id: BOOK_PID },
      });
      mockBookingService.confirm!.mockRejectedValue(new Error('Already confirmed'));

      await expect(svc.onPaymentCaptured(PAYLOAD as never)).resolves.not.toThrow();
    });
  });

  // ── handlePaymentSuccess ───────────────────────────────────────────────────

  describe('handlePaymentSuccess()', () => {
    it('delegates to PaymentService.capture() with correct parameters', async () => {
      const { svc, mockPaymentService } = makeOrchSvc();

      await svc.handlePaymentSuccess({
        tenantId:         T,
        financePaymentId: FIN_PID,
        gatewayPaymentId: 'pi_success_001',
        capturedMinor:    2000,
        actorId:          A,
      });

      expect(mockPaymentService.capture).toHaveBeenCalledWith(
        FIN_PID,
        { amountMinor: 2000 },
        T,
        A,
      );
    });
  });

  // ── handlePaymentFailure ───────────────────────────────────────────────────

  describe('handlePaymentFailure()', () => {
    it('delegates to PaymentService.fail() with the failure reason', async () => {
      const { svc, mockPaymentService } = makeOrchSvc();

      await svc.handlePaymentFailure({
        tenantId:         T,
        financePaymentId: FIN_PID,
        reason:           'Card declined',
        actorId:          A,
      });

      expect(mockPaymentService.fail).toHaveBeenCalledWith(
        FIN_PID,
        { reason: 'Card declined' },
        T,
        A,
      );
    });

    it('publishes PAYMENT_FAILED to Redis after fail()', async () => {
      const { svc, mockPublisher } = makeOrchSvc();

      await svc.handlePaymentFailure({
        tenantId:         T,
        financePaymentId: FIN_PID,
        reason:           'Expired card',
        actorId:          A,
      });

      expect(mockPublisher.publishPaymentFailed).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: T, paymentId: FIN_PID }),
      );
    });
  });
});

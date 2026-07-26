/**
 * payment-gateway.spec.ts
 *
 * Tests for production payment gateway integrations:
 *   - StripeAdapter (real SDK, mocked Stripe client)
 *   - RazorpayAdapter (real SDK, mocked Razorpay client)
 *   - WebhookHandlerService — signature verification, idempotency, routing
 *   - GatewayRegistry — adapter selection, multi-tenant credential lookup
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Strategy
 * ─────────────────────────────────────────────────────────────────────────────
 *   Adapters: mock the SDK client (stripe / razorpay) via jest.spyOn on require()
 *   so the production code path (initiate / capture / refund / reconcile) is
 *   exercised with controlled responses.
 *
 *   WebhookHandlerService: construct with mocked ConfigService and DataSource.
 *   The signature-verification code paths (HMAC, timing-safe compare) are
 *   exercised directly — no Stripe/Razorpay client involved.
 *
 * Coverage:
 *   StripeAdapter
 *   ✓ initiate() creates PaymentIntent and returns id + clientSecret
 *   ✓ capture() skips already-succeeded intents (idempotent)
 *   ✓ capture() calls stripe.paymentIntents.capture on requires_capture status
 *   ✓ refund() creates Stripe refund with idempotencyKey
 *   ✓ reconcile() returns current status and capturedMinor
 *
 *   RazorpayAdapter
 *   ✓ initiate() creates Razorpay Order and returns orderId as gatewayPaymentId
 *   ✓ capture() skips already-captured payments (idempotent)
 *   ✓ capture() calls payments.capture for non-captured payments
 *   ✓ refund() returns existing refund when idempotencyKey matches
 *   ✓ refund() creates new refund when no prior match
 *   ✓ reconcile() fetches order payments for order_ prefix IDs
 *   ✓ reconcile() fetches payment directly for pay_ prefix IDs
 *
 *   WebhookHandlerService — signature verification
 *   ✓ Stripe: valid signature + recent timestamp → passes
 *   ✓ Stripe: wrong signature → BadRequestException
 *   ✓ Stripe: timestamp too old → BadRequestException
 *   ✓ Stripe: missing signature header → BadRequestException
 *   ✓ Razorpay: valid signature → passes
 *   ✓ Razorpay: invalid signature → BadRequestException
 *   ✓ Unknown provider → BadRequestException
 *
 *   WebhookHandlerService — idempotency
 *   ✓ Duplicate event ID (23505) → { status: 'duplicate' } (no throw)
 *
 *   GatewayRegistry
 *   ✓ getActiveGateway() returns Stripe adapter when PAYMENT_GATEWAY=stripe
 *   ✓ getActiveGateway() returns Razorpay adapter when PAYMENT_GATEWAY=razorpay
 *   ✓ getGateway('unknown') → NotFoundException
 *   ✓ getAdapterForTenant() falls back to active gateway when no override
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as crypto            from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StripeAdapter }          from '../../finance/gateway/stripe.adapter';
import { RazorpayAdapter }        from '../../finance/gateway/razorpay.adapter';
import { WebhookHandlerService }  from '../services/webhook-handler.service';
import { GatewayRegistry }        from '../services/gateway-registry.service';

// ── Test constants ─────────────────────────────────────────────────────────────
const TENANT   = 'tenant-pay-0000-0000-000000000001';
const STRIPE_KEY    = 'sk_test_fake_key';
const STRIPE_WSEC   = 'whsec_test_secret';
const RP_KEY_ID     = 'rzp_test_fake_id';
const RP_KEY_SEC    = 'test_secret_key';
const RP_WSEC       = 'razorpay_webhook_secret';

// ── StripeAdapter ──────────────────────────────────────────────────────────────

describe('StripeAdapter', () => {
  function makeAdapter(mockStripeClient: Record<string, unknown>) {
    const config = {
      get: jest.fn().mockImplementation((key: string, def?: unknown) => {
        if (key === 'STRIPE_SECRET_KEY')     return STRIPE_KEY;
        if (key === 'STRIPE_API_VERSION')    return '2024-06-20';
        if (key === 'STRIPE_CAPTURE_METHOD') return 'automatic';
        return def;
      }),
    };

    const adapter = new StripeAdapter(config as never);

    // Inject the mock Stripe client directly (bypasses require() in onModuleInit)
    (adapter as unknown as Record<string, unknown>)['stripe'] = mockStripeClient;

    return adapter;
  }

  it('initiate() creates a PaymentIntent and returns gatewayPaymentId + clientSecret', async () => {
    const mockIntent = {
      id:            'pi_test_123',
      status:        'requires_payment_method',
      client_secret: 'pi_test_123_secret_abc',
      amount:        2000,
      currency:      'gbp',
    };

    const adapter = makeAdapter({
      paymentIntents: {
        create: jest.fn().mockResolvedValue(mockIntent),
      },
    });

    const result = await adapter.initiate({
      tenantId:       TENANT,
      amountMinor:    2000,
      currency:       'GBP',
      idempotencyKey: 'bk_test-booking_uuid-001',
    });

    expect(result.gatewayPaymentId).toBe('pi_test_123');
    expect(result.clientSecret).toBe('pi_test_123_secret_abc');
    expect(result.gatewayStatus).toBe('requires_payment_method');
  });

  it('capture() is idempotent — skips already-succeeded PaymentIntents', async () => {
    const mockSucceeded = {
      id:              'pi_already_done',
      status:          'succeeded',
      amount_received: 2000,
    };

    const mockCapture = jest.fn();

    const adapter = makeAdapter({
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue(mockSucceeded),
        capture:  mockCapture,
      },
    });

    const result = await adapter.capture({
      gatewayPaymentId: 'pi_already_done',
      amountMinor:      2000,
      currency:         'GBP',
      idempotencyKey:   'cap_test_001',
    });

    expect(mockCapture).not.toHaveBeenCalled();
    expect(result.gatewayStatus).toBe('succeeded');
    expect(result.capturedMinor).toBe(2000);
  });

  it('capture() calls stripe.paymentIntents.capture on requires_capture status', async () => {
    const mockRequiresCapture = { id: 'pi_pending', status: 'requires_capture', amount_received: 0 };
    const mockCaptured        = { id: 'pi_pending', status: 'succeeded', amount_received: 2000 };
    const mockCapture = jest.fn().mockResolvedValue(mockCaptured);

    const adapter = makeAdapter({
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue(mockRequiresCapture),
        capture:  mockCapture,
      },
    });

    const result = await adapter.capture({
      gatewayPaymentId: 'pi_pending',
      amountMinor:      2000,
      currency:         'GBP',
      idempotencyKey:   'cap_test_002',
    });

    expect(mockCapture).toHaveBeenCalledWith(
      'pi_pending',
      { amount_to_capture: 2000 },
      { idempotencyKey: 'cap_test_002' },
    );
    expect(result.capturedMinor).toBe(2000);
  });

  it('refund() creates a Stripe Refund with the idempotencyKey', async () => {
    const mockRefund = { id: 're_test_001', status: 'succeeded', amount: 1000 };
    const mockCreate = jest.fn().mockResolvedValue(mockRefund);

    const adapter = makeAdapter({
      refunds: { create: mockCreate },
    });

    const result = await adapter.refund({
      gatewayPaymentId: 'pi_test_123',
      amountMinor:      1000,
      currency:         'GBP',
      idempotencyKey:   'ref_test_001',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_test_123', amount: 1000 }),
      { idempotencyKey: 'ref_test_001' },
    );
    expect(result.gatewayRefundId).toBe('re_test_001');
    expect(result.gatewayStatus).toBe('succeeded');
  });

  it('reconcile() returns gatewayStatus and capturedMinor', async () => {
    const mockIntent = { id: 'pi_test_123', status: 'succeeded', amount_received: 2000 };

    const adapter = makeAdapter({
      paymentIntents: { retrieve: jest.fn().mockResolvedValue(mockIntent) },
    });

    const result = await adapter.reconcile({ gatewayPaymentId: 'pi_test_123' });

    expect(result.gatewayStatus).toBe('succeeded');
    expect(result.capturedMinor).toBe(2000);
  });
});

// ── RazorpayAdapter ────────────────────────────────────────────────────────────

describe('RazorpayAdapter', () => {
  function makeAdapter(mockRazorpayClient: Record<string, unknown>) {
    const config = {
      get: jest.fn().mockImplementation((key: string, def?: unknown) => {
        if (key === 'RAZORPAY_KEY_ID')     return RP_KEY_ID;
        if (key === 'RAZORPAY_KEY_SECRET')  return RP_KEY_SEC;
        if (key === 'RAZORPAY_CURRENCY')    return 'INR';
        return def;
      }),
    };

    const adapter = new RazorpayAdapter(config as never);
    (adapter as unknown as Record<string, unknown>)['razorpay'] = mockRazorpayClient;
    return adapter;
  }

  it('initiate() creates a Razorpay Order and returns orderId as gatewayPaymentId', async () => {
    const mockOrder = { id: 'order_test_001', status: 'created', amount: 50000 };
    const mockCreate = jest.fn().mockResolvedValue(mockOrder);

    const adapter = makeAdapter({ orders: { create: mockCreate } });

    const result = await adapter.initiate({
      tenantId:       TENANT,
      amountMinor:    50000,
      currency:       'INR',
      idempotencyKey: 'bk_test-booking_uuid-001',
    });

    expect(result.gatewayPaymentId).toBe('order_test_001');
    expect(result.gatewayStatus).toBe('created');
    expect(result.clientSecret).toBeUndefined();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50000, currency: 'INR' }),
    );
  });

  it('capture() is idempotent — skips already-captured payments', async () => {
    const mockPayment = { id: 'pay_captured_001', status: 'captured', amount: 50000 };
    const mockCapture = jest.fn();

    const adapter = makeAdapter({
      payments: {
        fetch:   jest.fn().mockResolvedValue(mockPayment),
        capture: mockCapture,
      },
    });

    const result = await adapter.capture({
      gatewayPaymentId: 'pay_captured_001',
      amountMinor:      50000,
      currency:         'INR',
      idempotencyKey:   'cap_test_001',
    });

    expect(mockCapture).not.toHaveBeenCalled();
    expect(result.gatewayStatus).toBe('captured');
  });

  it('capture() calls payments.capture for non-captured payments', async () => {
    const mockPayment  = { id: 'pay_auth_001', status: 'authorized', amount: 50000 };
    const mockCaptured = { id: 'pay_auth_001', status: 'captured',   amount: 50000 };
    const mockCapture  = jest.fn().mockResolvedValue(mockCaptured);

    const adapter = makeAdapter({
      payments: {
        fetch:   jest.fn().mockResolvedValue(mockPayment),
        capture: mockCapture,
      },
    });

    await adapter.capture({
      gatewayPaymentId: 'pay_auth_001',
      amountMinor:      50000,
      currency:         'INR',
      idempotencyKey:   'cap_test_002',
    });

    expect(mockCapture).toHaveBeenCalledWith('pay_auth_001', 50000, 'INR');
  });

  it('refund() returns existing refund when idempotencyKey already exists', async () => {
    const existingRefund = {
      id:     'rfnd_existing',
      status: 'processed',
      notes:  { idempotency_key: 'ref_dedup_001' },
    };

    const mockRefund = jest.fn();

    const adapter = makeAdapter({
      payments: {
        fetchMultipleRefund: jest.fn().mockResolvedValue({ items: [existingRefund] }),
        refund:              mockRefund,
      },
    });

    const result = await adapter.refund({
      gatewayPaymentId: 'pay_test_001',
      amountMinor:      5000,
      currency:         'INR',
      idempotencyKey:   'ref_dedup_001',
    });

    expect(mockRefund).not.toHaveBeenCalled();
    expect(result.gatewayRefundId).toBe('rfnd_existing');
  });

  it('refund() creates a new refund when no prior match exists', async () => {
    const newRefund  = { id: 'rfnd_new_001', status: 'processed', amount: 5000 };
    const mockRefund = jest.fn().mockResolvedValue(newRefund);

    const adapter = makeAdapter({
      payments: {
        fetchMultipleRefund: jest.fn().mockResolvedValue({ items: [] }),
        refund:              mockRefund,
      },
    });

    const result = await adapter.refund({
      gatewayPaymentId: 'pay_test_001',
      amountMinor:      5000,
      currency:         'INR',
      idempotencyKey:   'ref_new_001',
    });

    expect(mockRefund).toHaveBeenCalledWith('pay_test_001', expect.objectContaining({ amount: 5000 }));
    expect(result.gatewayRefundId).toBe('rfnd_new_001');
  });

  it('reconcile() fetches order payments when gatewayPaymentId is an orderId', async () => {
    const mockFetchPayments = jest.fn().mockResolvedValue({
      items: [{ id: 'pay_linked_001', status: 'captured', amount: 50000 }],
    });

    const adapter = makeAdapter({
      orders:   { fetchPayments: mockFetchPayments },
      payments: { fetch: jest.fn() },
    });

    const result = await adapter.reconcile({ gatewayPaymentId: 'order_test_001' });

    expect(mockFetchPayments).toHaveBeenCalledWith('order_test_001');
    expect(result.gatewayStatus).toBe('captured');
    expect(result.capturedMinor).toBe(50000);
  });

  it('reconcile() fetches payment directly for pay_ prefix IDs', async () => {
    const mockPayment = { id: 'pay_direct_001', status: 'captured', amount: 50000 };

    const adapter = makeAdapter({
      payments: { fetch: jest.fn().mockResolvedValue(mockPayment) },
    });

    const result = await adapter.reconcile({ gatewayPaymentId: 'pay_direct_001' });

    expect(result.gatewayStatus).toBe('captured');
    expect(result.capturedMinor).toBe(50000);
  });
});

// ── WebhookHandlerService — signature verification ─────────────────────────────

describe('WebhookHandlerService — signature verification', () => {
  function makeService(configOverrides: Record<string, string> = {}) {
    const defaults: Record<string, string | number> = {
      STRIPE_WEBHOOK_SECRET:    STRIPE_WSEC,
      RAZORPAY_WEBHOOK_SECRET:  RP_WSEC,
      WEBHOOK_SYSTEM_ACTOR_ID:  'system:webhook',
      WEBHOOK_TIMESTAMP_TOLERANCE_MS: 300_000,
    };

    const config = {
      get: jest.fn().mockImplementation((key: string, def?: unknown) =>
        configOverrides[key] ?? defaults[key] ?? def,
      ),
    };

    const mockOrchestrator = {
      handlePaymentSuccess: jest.fn().mockResolvedValue(undefined),
      handlePaymentFailure: jest.fn().mockResolvedValue(undefined),
    };

    const savedId   = 'whe-test-001';
    const mockRepo  = { create: jest.fn().mockReturnValue({ id: savedId }), save: jest.fn().mockResolvedValue({ id: savedId }), update: jest.fn().mockResolvedValue(undefined) };
    const mockDs    = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
      query:         jest.fn().mockResolvedValue([]),
    };

    const svc = new WebhookHandlerService(
      config as never,
      mockOrchestrator as never,
      mockDs as never,
    );

    return { svc, mockRepo, config };
  }

  function makeStripeSignature(rawBody: Buffer, secret: string, timestamp?: number): string {
    const ts  = timestamp ?? Math.floor(Date.now() / 1000);
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${ts}.${rawBody.toString('utf8')}`)
      .digest('hex');
    return `t=${ts},v1=${sig}`;
  }

  function makeRazorpaySignature(rawBody: Buffer, secret: string): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  it('Stripe: valid signature + recent timestamp → processes without error', async () => {
    const { svc, mockRepo } = makeService();
    const body    = Buffer.from(JSON.stringify({ id: 'evt_001', type: 'payment_intent.succeeded', data: { object: { id: 'pi_001', amount_received: 2000 } } }));
    const sig     = makeStripeSignature(body, STRIPE_WSEC);

    await expect(
      svc.handle({ provider: 'stripe', tenantId: TENANT, rawBody: body, signature: sig, payload: JSON.parse(body.toString()) }),
    ).resolves.not.toThrow();
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('Stripe: wrong signature → BadRequestException', async () => {
    const { svc } = makeService();
    const body = Buffer.from('{}');
    const sig  = makeStripeSignature(body, 'wrong_secret');

    await expect(
      svc.handle({ provider: 'stripe', tenantId: TENANT, rawBody: body, signature: sig, payload: {} }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Stripe: timestamp too old → BadRequestException', async () => {
    const { svc } = makeService({ WEBHOOK_TIMESTAMP_TOLERANCE_MS: '100' });
    const body      = Buffer.from('{}');
    const oldTs     = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const sig       = makeStripeSignature(body, STRIPE_WSEC, oldTs);

    await expect(
      svc.handle({ provider: 'stripe', tenantId: TENANT, rawBody: body, signature: sig, payload: {} }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Stripe: missing signature header → BadRequestException', async () => {
    const { svc } = makeService();
    const body = Buffer.from('{}');

    await expect(
      svc.handle({ provider: 'stripe', tenantId: TENANT, rawBody: body, signature: undefined, payload: {} }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Razorpay: valid signature → processes without error', async () => {
    const { svc, mockRepo } = makeService();
    const rpPayload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_001', amount: 50000, order_id: 'order_001' } } } };
    const body      = Buffer.from(JSON.stringify(rpPayload));
    const sig       = makeRazorpaySignature(body, RP_WSEC);

    await expect(
      svc.handle({ provider: 'razorpay', tenantId: TENANT, rawBody: body, signature: sig, payload: rpPayload }),
    ).resolves.not.toThrow();
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('Razorpay: invalid signature → BadRequestException', async () => {
    const { svc } = makeService();
    const body     = Buffer.from('{}');
    // Valid-length hex (64 chars) but computed with wrong key
    const wrongSig = crypto.createHmac('sha256', 'wrong_key').update(body).digest('hex');

    await expect(
      svc.handle({ provider: 'razorpay', tenantId: TENANT, rawBody: body, signature: wrongSig, payload: {} }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Unknown provider → BadRequestException', async () => {
    const { svc } = makeService();
    await expect(
      svc.handle({ provider: 'paypal', tenantId: TENANT, rawBody: Buffer.from('{}'), signature: 'sig', payload: {} }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Duplicate event ID (23505 constraint violation) → { status: duplicate }', async () => {
    const { svc, mockRepo } = makeService();
    // Make repo.save throw a PG unique-constraint violation
    mockRepo.save.mockRejectedValue({ code: '23505' });

    const body = Buffer.from(JSON.stringify({ id: 'evt_dup', type: 'payment_intent.succeeded', data: { object: { id: 'pi_dup' } } }));
    const sig  = makeStripeSignature(body, STRIPE_WSEC);

    const result = await svc.handle({
      provider: 'stripe', tenantId: TENANT,
      rawBody: body, signature: sig,
      payload: JSON.parse(body.toString()),
    });

    expect(result.status).toBe('duplicate');
  });
});

// ── GatewayRegistry ────────────────────────────────────────────────────────────

describe('GatewayRegistry', () => {
  function makeRegistry(gatewayEnv: string) {
    const mockStripe    = { gatewayName: 'stripe' }   as never;
    const mockRazorpay  = { gatewayName: 'razorpay' } as never;

    const config = {
      get: jest.fn().mockImplementation((key: string, def?: unknown) =>
        key === 'PAYMENT_GATEWAY' ? gatewayEnv : def,
      ),
    };

    const mockDs = { query: jest.fn().mockResolvedValue([]) };

    const registry = new GatewayRegistry(config as never, mockStripe, mockRazorpay, mockDs as never);
    return { registry, mockStripe, mockRazorpay, mockDs };
  }

  it('getActiveGateway() returns Stripe adapter when PAYMENT_GATEWAY=stripe', () => {
    const { registry, mockStripe } = makeRegistry('stripe');
    expect(registry.getActiveGateway()).toBe(mockStripe);
  });

  it('getActiveGateway() returns Razorpay adapter when PAYMENT_GATEWAY=razorpay', () => {
    const { registry, mockRazorpay } = makeRegistry('razorpay');
    expect(registry.getActiveGateway()).toBe(mockRazorpay);
  });

  it('getGateway() is case-insensitive', () => {
    const { registry, mockStripe } = makeRegistry('stripe');
    expect(registry.getGateway('STRIPE')).toBe(mockStripe);
    expect(registry.getGateway('Stripe')).toBe(mockStripe);
  });

  it('getGateway() throws NotFoundException for unknown gateway', () => {
    const { registry } = makeRegistry('stripe');
    expect(() => registry.getGateway('paypal')).toThrow(NotFoundException);
  });

  it('getAdapterForTenant() falls back to active gateway when table query returns empty', async () => {
    const { registry, mockStripe } = makeRegistry('stripe');
    const adapter = await registry.getAdapterForTenant(TENANT);
    expect(adapter).toBe(mockStripe);
  });

  it('getAdapterForTenant() falls back gracefully when table does not exist', async () => {
    const { registry, mockStripe, mockDs } = makeRegistry('stripe');
    mockDs.query.mockRejectedValue(new Error('relation "tenant_payment_credentials" does not exist'));

    const adapter = await registry.getAdapterForTenant(TENANT);
    expect(adapter).toBe(mockStripe);
  });

  it('listGateways() returns all registered gateway names', () => {
    const { registry } = makeRegistry('stripe');
    expect(registry.listGateways()).toEqual(expect.arrayContaining(['stripe', 'razorpay']));
  });
});

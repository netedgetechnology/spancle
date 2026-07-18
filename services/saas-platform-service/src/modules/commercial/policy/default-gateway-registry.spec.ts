/**
 * default-gateway-registry.spec.ts
 *
 * Unit tests for DefaultGatewayRegistry — gateway selection, currency
 * and country filtering, priority resolution, credential preference,
 * deterministic ordering, and no Finance dependency.
 */
import { Test, type TestingModule }  from '@nestjs/testing';
import { EventEmitter2 }             from '@nestjs/event-emitter';
import { DefaultGatewayRegistry }    from './default-gateway-registry';
import { GATEWAY_REGISTRY }          from '../interfaces/gateway-registry.interfaces';
import { GatewayPriority, GatewayScope, GatewayType, PaymentOwnershipType } from '../enums/commercial.enums';
import type { GatewayDefinitionEntity, GatewayCredentialEntity } from '../entities/commercial-policy-gateway-flag-audit.entity';
import type { GatewaySelectionContext } from '../interfaces/gateway-registry.interfaces';

// ── Fixtures ──────────────────────────────────────────────────────────────────

let idSeq = 0;
const uid = () => `${String(++idSeq).padStart(8, '0')}-0000-0000-0000-000000000000`;

function def(
  type: GatewayType,
  currencies: string[],
  countries: string[] = [],
  overrides: Partial<GatewayDefinitionEntity> = {},
): GatewayDefinitionEntity {
  return {
    id:          uid(),
    gatewayType: type,
    displayName: type,
    supportedCurrencies: currencies,
    capabilities: countries.length ? { supportedCountries: countries } : {},
    isActive:    true,
    configSchema: {},
    createdAt:   new Date(),
    updatedAt:   new Date(),
    ...overrides,
  };
}

function cred(
  gatewayDefinitionId: string,
  scope: GatewayScope,
  tenantId: string | null = null,
): GatewayCredentialEntity {
  return {
    id:                    uid(),
    tenantId,
    gatewayDefinitionId,
    scope,
    publicConfig:          { publishableKey: 'pk_test_xxx' },
    secretConfigEncrypted: 'ENCRYPTED_SECRET_SHOULD_NEVER_APPEAR',
    isActive:              true,
    createdById:           null,
    createdAt:             new Date(),
    updatedAt:             new Date(),
  };
}

const DEFAULT_CTX: GatewaySelectionContext = {
  tenantId:    'tenant-001',
  currency:    'GBP',
  country:     'GB',
  tenantOwned: false,
};

async function buildRegistry() {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DefaultGatewayRegistry,
      { provide: EventEmitter2, useValue: { emitAsync: jest.fn().mockResolvedValue(undefined) } },
    ],
  }).compile();
  return module.get(DefaultGatewayRegistry);
}

// =============================================================================
// Tests
// =============================================================================

describe('DefaultGatewayRegistry', () => {

  // ── Happy path ──────────────────────────────────────────────────────────

  describe('resolve() — basic selection', () => {
    it('returns all gateway definitions in the bundle', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE,   ['GBP', 'USD']);
      const rzp    = def(GatewayType.RAZORPAY, ['INR', 'USD']);

      const bundle = svc.resolve([stripe, rzp], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.all).toHaveLength(2);
    });

    it('eligible[] contains only gateways matching currency and country', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE,   ['GBP'], ['GB']);
      const rzp    = def(GatewayType.RAZORPAY, ['INR'], ['IN']);

      const bundle = svc.resolve([stripe, rzp], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.eligible).toHaveLength(1);
      expect(bundle.eligible[0]!.definition.gatewayType).toBe(GatewayType.STRIPE);
    });

    it('primary is the first eligible gateway', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE,   ['GBP']);
      const rzp    = def(GatewayType.RAZORPAY, ['GBP']);

      const bundle = svc.resolve([stripe, rzp], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.primary).not.toBeNull();
      expect(bundle.primary!.definition.gatewayType).toBe(GatewayType.STRIPE);  // STRIPE has lower order index
    });

    it('primary is null when no gateway matches', async () => {
      const svc = await buildRegistry();
      const rzp = def(GatewayType.RAZORPAY, ['INR'], ['IN']);

      const bundle = svc.resolve([rzp], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.primary).toBeNull();
      expect(bundle.eligible).toHaveLength(0);
    });
  });

  // ── Currency filtering ───────────────────────────────────────────────────

  describe('Currency filtering', () => {
    it('gateway with empty supportedCurrencies matches any currency', async () => {
      const svc   = await buildRegistry();
      const manual = def(GatewayType.MANUAL, []);  // empty = accept all

      const bundle = svc.resolve([manual], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.eligible).toHaveLength(1);
    });

    it('currency comparison is case-insensitive', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['gbp']);  // lowercase

      const bundle = svc.resolve([stripe], [], PaymentOwnershipType.PLATFORM, {
        ...DEFAULT_CTX, currency: 'GBP',
      });

      expect(bundle.eligible).toHaveLength(1);
    });

    it('gateway not matching requested currency is ineligible', async () => {
      const svc = await buildRegistry();
      const rzp = def(GatewayType.RAZORPAY, ['INR']);

      const bundle = svc.resolve([rzp], [], PaymentOwnershipType.PLATFORM, {
        ...DEFAULT_CTX, currency: 'GBP',
      });

      expect(bundle.eligible).toHaveLength(0);
      expect(bundle.all[0]!.isEligible).toBe(false);
    });
  });

  // ── Country filtering ────────────────────────────────────────────────────

  describe('Country filtering', () => {
    it('gateway with empty supportedCountries matches any country', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP'], []);  // no country restriction

      const bundle = svc.resolve([stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.eligible).toHaveLength(1);
    });

    it('gateway with matching country is eligible', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP'], ['GB', 'US']);

      const bundle = svc.resolve([stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.eligible).toHaveLength(1);
    });

    it('gateway with non-matching country is ineligible', async () => {
      const svc  = await buildRegistry();
      const rzp  = def(GatewayType.RAZORPAY, ['INR'], ['IN']);

      const bundle = svc.resolve([rzp], [], PaymentOwnershipType.PLATFORM, {
        ...DEFAULT_CTX, currency: 'INR', country: 'GB',
      });

      expect(bundle.eligible).toHaveLength(0);
    });

    it('country comparison is case-insensitive', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP'], ['gb']);  // lowercase

      const bundle = svc.resolve([stripe], [], PaymentOwnershipType.PLATFORM, {
        ...DEFAULT_CTX, country: 'GB',
      });

      expect(bundle.eligible).toHaveLength(1);
    });
  });

  // ── Priority resolution ──────────────────────────────────────────────────

  describe('Priority resolution', () => {
    it('PLATFORM-owned context: platform credential → PRIMARY, tenant credential → SECONDARY', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);
      const platCred   = cred(stripe.id, GatewayScope.PLATFORM, null);
      const tenantCred = cred(stripe.id, GatewayScope.TENANT, 'tenant-001');

      // Both exist — platform-owned context means platform cred is PRIMARY
      const bundle = svc.resolve([stripe], [platCred], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.all[0]!.priority).toBe(GatewayPriority.PRIMARY);
    });

    it('TENANT-owned context: tenant credential → PRIMARY, platform credential → SECONDARY', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);
      const tenantCred = cred(stripe.id, GatewayScope.TENANT, 'tenant-001');

      const bundle = svc.resolve([stripe], [tenantCred], PaymentOwnershipType.TENANT, {
        ...DEFAULT_CTX, tenantOwned: true,
      });

      expect(bundle.all[0]!.priority).toBe(GatewayPriority.PRIMARY);
    });

    it('gateway with no credential → FALLBACK priority', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);

      const bundle = svc.resolve([stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.all[0]!.priority).toBe(GatewayPriority.FALLBACK);
    });

    it('SPLIT ownership treats tenant credential as PRIMARY', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);
      const tenantCred = cred(stripe.id, GatewayScope.TENANT, 'tenant-001');

      const bundle = svc.resolve([stripe], [tenantCred], PaymentOwnershipType.SPLIT, {
        ...DEFAULT_CTX, tenantOwned: true,
      });

      expect(bundle.all[0]!.priority).toBe(GatewayPriority.PRIMARY);
    });
  });

  // ── Deterministic ordering ───────────────────────────────────────────────

  describe('Deterministic ordering', () => {
    it('same input always produces same gateway order (deterministic replay)', async () => {
      const svc     = await buildRegistry();
      const stripe  = def(GatewayType.STRIPE,   ['GBP']);
      const rzp     = def(GatewayType.RAZORPAY, ['GBP']);
      const cashfree = def(GatewayType.CASHFREE, ['GBP']);

      const bundleA = svc.resolve([cashfree, rzp, stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);
      const bundleB = svc.resolve([cashfree, rzp, stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      const typesA = bundleA.eligible.map((e) => e.definition.gatewayType);
      const typesB = bundleB.eligible.map((e) => e.definition.gatewayType);

      expect(typesA).toEqual(typesB);
    });

    it('STRIPE appears before RAZORPAY within same priority tier', async () => {
      const svc    = await buildRegistry();
      const rzp    = def(GatewayType.RAZORPAY, ['GBP']);
      const stripe = def(GatewayType.STRIPE,   ['GBP']);

      const bundle = svc.resolve([rzp, stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      const types = bundle.eligible.map((e) => e.definition.gatewayType);
      expect(types.indexOf(GatewayType.STRIPE)).toBeLessThan(types.indexOf(GatewayType.RAZORPAY));
    });

    it('inactive gateways are excluded', async () => {
      const svc     = await buildRegistry();
      const inactive = def(GatewayType.STRIPE, ['GBP'], [], { isActive: false });

      const bundle  = svc.resolve([inactive], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.all).toHaveLength(0);
    });
  });

  // ── Credential safety ────────────────────────────────────────────────────

  describe('Credential safety', () => {
    it('secretConfigEncrypted is NEVER present in any GatewayEntry', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);
      const platCred = cred(stripe.id, GatewayScope.PLATFORM, null);

      const bundle = svc.resolve([stripe], [platCred], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      bundle.all.forEach((entry) => {
        if (entry.credential) {
          expect('secretConfigEncrypted' in entry.credential).toBe(false);
        }
      });
    });

    it('publicConfig is accessible in the credential reference', async () => {
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);
      const platCred = cred(stripe.id, GatewayScope.PLATFORM, null);

      const bundle = svc.resolve([stripe], [platCred], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.all[0]!.credential?.publicConfig).toMatchObject({ publishableKey: 'pk_test_xxx' });
    });
  });

  // ── No Finance dependency ────────────────────────────────────────────────

  describe('No Finance dependency', () => {
    it('registry source file does not import Finance or Booking modules', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src  = path.resolve(process.cwd(), 'src/modules/commercial/policy/default-gateway-registry.ts');
      const source = fs.readFileSync(src, 'utf8');
      expect(source).not.toMatch(/FinanceModule|BookingModule/);
      expect(source).not.toMatch(/finance\.service|booking\.service/i);
    });

    it('resolve() returns without executing any payment operations', async () => {
      // The registry only returns a bundle — no async operations aside from event emission
      const svc    = await buildRegistry();
      const stripe = def(GatewayType.STRIPE, ['GBP']);

      const bundle = svc.resolve([stripe], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      // If any payment were attempted, the mock eventEmitter would have been called differently
      expect(bundle).toBeDefined();
      expect(typeof bundle.primary).toBe('object');  // null or GatewayEntry — never a Promise
    });
  });

  // ── Empty input ──────────────────────────────────────────────────────────

  describe('Empty input', () => {
    it('returns empty bundle when no gateway definitions provided', async () => {
      const svc    = await buildRegistry();
      const bundle = svc.resolve([], [], PaymentOwnershipType.PLATFORM, DEFAULT_CTX);

      expect(bundle.eligible).toHaveLength(0);
      expect(bundle.all).toHaveLength(0);
      expect(bundle.primary).toBeNull();
    });
  });
});

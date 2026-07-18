/**
 * gateway-registry.interfaces.ts
 *
 * Contract for the Gateway Registry — resolves payment gateways without
 * executing payments. No Finance dependency. No provider SDK calls.
 *
 * The registry selects and orders available gateways based on:
 *   1. PaymentOwnershipPolicy (who holds the merchant account)
 *   2. GatewayCredential scope (PLATFORM vs TENANT)
 *   3. Supported currency match
 *   4. Supported country match (from capabilities.supportedCountries)
 *   5. Gateway priority ordering
 *
 * GatewayCredentials are included as reference only:
 *   - publicConfig is exposed (publishable key, webhook URL, etc.)
 *   - secretConfigEncrypted is NEVER included in the bundle
 */
import type { GatewayDefinitionEntity, GatewayCredentialEntity } from '../entities/commercial-policy-gateway-flag-audit.entity';
import type { GatewayPriority, GatewayType } from '../enums/commercial.enums';

// ── GatewayEntry ──────────────────────────────────────────────────────────────

/**
 * A single selected gateway with its credential reference and priority.
 *
 * secretConfigEncrypted is always omitted — callers receive publicConfig only.
 */
export interface GatewayEntry {
  definition:  Readonly<GatewayDefinitionEntity>;
  /** Credential reference — publicConfig only. secretConfigEncrypted excluded. */
  credential:  Readonly<Omit<GatewayCredentialEntity, 'secretConfigEncrypted'>> | null;
  priority:    GatewayPriority;
  /** ISO 4217 currencies this gateway supports for the given context */
  supportedCurrencies: string[];
  /** ISO 3166-1 alpha-2 country codes from capabilities.supportedCountries */
  supportedCountries:  string[];
  /** Whether this gateway matches the requested currency + country */
  isEligible:          boolean;
}

// ── GatewayBundle ─────────────────────────────────────────────────────────────

/**
 * Immutable bundle of selected gateways for a given commercial decision context.
 *
 * Gateways are ordered by priority: PRIMARY → SECONDARY → FALLBACK.
 * Within each priority tier, order is deterministic (stable by gatewayType).
 *
 * eligible[] contains only gateways that match both currency and country.
 * all[]     contains every resolved gateway including ineligible ones.
 */
export interface GatewayBundle {
  /**
   * Gateways eligible for this transaction (matching currency + country),
   * ordered by priority then by gatewayType for determinism.
   * Empty when no gateway matches the context.
   */
  eligible: ReadonlyArray<GatewayEntry>;

  /** All resolved gateways regardless of currency/country match. */
  all: ReadonlyArray<GatewayEntry>;

  /**
   * The recommended gateway for this transaction.
   * First entry from eligible[], or null when none match.
   */
  primary: Readonly<GatewayEntry> | null;

  /** Currency from the decision context used for filtering. */
  requestedCurrency: string;

  /** Country from the decision context used for filtering. */
  requestedCountry: string;

  /** Wall-clock time this bundle was resolved. */
  resolvedAt: Date;
}

// ── GatewaySelectionContext ───────────────────────────────────────────────────

export interface GatewaySelectionContext {
  tenantId:  string;
  currency:  string;
  country:   string;
  /** Whether the tenant has TENANT-scoped ownership (determines credential preference) */
  tenantOwned: boolean;
}

// ── IGatewayRegistry ─────────────────────────────────────────────────────────

/**
 * Gateway Registry contract.
 *
 * Implementations must:
 *   - Never call payment provider SDKs.
 *   - Never depend on BookingModule or FinanceModule.
 *   - Exclude secretConfigEncrypted from all returned data.
 *   - Return an empty eligible[] rather than throwing when no gateway matches.
 *   - Apply deterministic ordering (no random selection).
 *   - Emit GATEWAY_SELECTED on success.
 *   - Emit GATEWAY_SELECTION_FAILED on unrecoverable error.
 */
export interface IGatewayRegistry {
  /**
   * Resolves a GatewayBundle for the given context.
   * @param gatewayDefinitions Pre-loaded from DefaultPolicyResolver (no extra DB query).
   * @param credentials        Pre-loaded credentials for the tenant.
   * @param ownershipType      From PaymentOwnershipPolicy — determines credential scope preference.
   * @param context            Currency, country, tenantId for filtering.
   */
  resolve(
    gatewayDefinitions: ReadonlyArray<Readonly<GatewayDefinitionEntity>>,
    credentials:        ReadonlyArray<Readonly<GatewayCredentialEntity>>,
    ownershipType:      string,
    context:            GatewaySelectionContext,
  ): GatewayBundle;
}

export const GATEWAY_REGISTRY = Symbol('IGatewayRegistry');

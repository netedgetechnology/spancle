import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { CommercialEvents }   from '../events/commercial.events';
import {
  GatewayPriority,
  GatewayScope,
  GatewayType,
  PaymentOwnershipType,
} from '../enums/commercial.enums';
import type { GatewayDefinitionEntity, GatewayCredentialEntity } from '../entities/commercial-policy-gateway-flag-audit.entity';
import type {
  GatewayBundle,
  GatewayEntry,
  GatewaySelectionContext,
  IGatewayRegistry,
} from '../interfaces/gateway-registry.interfaces';

/**
 * Priority assignment rules:
 *   TENANT-owned context:  tenant-credential gateways → PRIMARY
 *                          platform-credential gateways → SECONDARY
 *   PLATFORM-owned context: platform-credential gateways → PRIMARY
 *                           tenant-credential gateways → SECONDARY
 *   No credential found:   FALLBACK
 *
 * Within each priority tier, ordering is deterministic by GatewayType enum insertion order.
 * This ensures the same context always produces the same ordered bundle.
 */
const GATEWAY_TYPE_ORDER: Record<GatewayType, number> = {
  [GatewayType.STRIPE]:   1,
  [GatewayType.RAZORPAY]: 2,
  [GatewayType.PAYU]:     3,
  [GatewayType.CASHFREE]: 4,
  [GatewayType.MANUAL]:   5,
  [GatewayType.CUSTOM]:   6,
};

const PRIORITY_ORDER: Record<GatewayPriority, number> = {
  [GatewayPriority.PRIMARY]:   1,
  [GatewayPriority.SECONDARY]: 2,
  [GatewayPriority.FALLBACK]:  3,
};

@Injectable()
export class DefaultGatewayRegistry implements IGatewayRegistry {
  private readonly logger = new Logger(DefaultGatewayRegistry.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  resolve(
    gatewayDefinitions: ReadonlyArray<Readonly<GatewayDefinitionEntity>>,
    credentials:        ReadonlyArray<Readonly<GatewayCredentialEntity>>,
    ownershipType:      string,
    context:            GatewaySelectionContext,
  ): GatewayBundle {
    const resolvedAt = new Date();
    const { tenantId, currency, country } = context;

    // Index credentials by gatewayDefinitionId for O(1) lookup.
    // TENANT-scoped credentials take precedence over PLATFORM-scoped.
    const credentialMap = new Map<string, Readonly<GatewayCredentialEntity>>();
    // Insert PLATFORM first (lower precedence), then TENANT overrides
    for (const cred of credentials) {
      if (cred.isActive && cred.scope === GatewayScope.PLATFORM) {
        credentialMap.set(cred.gatewayDefinitionId, cred);
      }
    }
    for (const cred of credentials) {
      if (cred.isActive && cred.scope === GatewayScope.TENANT) {
        credentialMap.set(cred.gatewayDefinitionId, cred);
      }
    }

    const tenantPreferred =
      ownershipType === PaymentOwnershipType.TENANT ||
      ownershipType === PaymentOwnershipType.SPLIT;

    const entries: GatewayEntry[] = [];

    for (const def of gatewayDefinitions) {
      if (!def.isActive) continue;

      const supportedCurrencies = def.supportedCurrencies;
      const caps = def.capabilities as Record<string, unknown>;
      const supportedCountries = (caps['supportedCountries'] as string[] | undefined) ?? [];

      const currencyMatch = supportedCurrencies.length === 0 ||
        supportedCurrencies.map((c) => c.toUpperCase()).includes(currency.toUpperCase());
      const countryMatch  = supportedCountries.length === 0 ||
        supportedCountries.map((c) => c.toUpperCase()).includes(country.toUpperCase());

      const credential = credentialMap.get(def.id) ?? null;
      const hasTenantCred  = credential?.scope === GatewayScope.TENANT;
      const hasPlatformCred = credential?.scope === GatewayScope.PLATFORM;

      // Priority assignment (no credential → FALLBACK)
      let priority: GatewayPriority;
      if (!credential) {
        priority = GatewayPriority.FALLBACK;
      } else if (tenantPreferred) {
        priority = hasTenantCred ? GatewayPriority.PRIMARY : GatewayPriority.SECONDARY;
      } else {
        priority = hasPlatformCred ? GatewayPriority.PRIMARY : GatewayPriority.SECONDARY;
      }

      // Strip secretConfigEncrypted — never expose to callers
      const safeCredential: Omit<GatewayCredentialEntity, 'secretConfigEncrypted'> | null =
        credential
          ? (({ secretConfigEncrypted: _, ...rest }) => rest)(credential as GatewayCredentialEntity)
          : null;

      entries.push({
        definition:          def,
        credential:          safeCredential,
        priority,
        supportedCurrencies,
        supportedCountries,
        isEligible:          currencyMatch && countryMatch,
      });
    }

    // Deterministic sort: priority tier first, then gatewayType enum order
    entries.sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      const aOrder = GATEWAY_TYPE_ORDER[a.definition.gatewayType as GatewayType] ?? 99;
      const bOrder = GATEWAY_TYPE_ORDER[b.definition.gatewayType as GatewayType] ?? 99;
      return aOrder - bOrder;
    });

    const eligible = entries.filter((e) => e.isEligible);
    const primary  = eligible[0] ?? null;

    const bundle: GatewayBundle = {
      eligible,
      all: entries,
      primary,
      requestedCurrency: currency,
      requestedCountry:  country,
      resolvedAt,
    };

    this.logger.debug(
      `resolve: tenant=${tenantId} currency=${currency} country=${country} ` +
      `total=${entries.length} eligible=${eligible.length} ` +
      `primary=${primary?.definition.gatewayType ?? 'none'}`,
    );

    this.eventEmitter.emitAsync(
      primary ? CommercialEvents.GATEWAY_SELECTED : CommercialEvents.GATEWAY_SELECTION_FAILED,
      {
        tenantId,
        primaryGatewayType: primary?.definition.gatewayType ?? null,
        eligibleCount:      eligible.length,
        totalCount:         entries.length,
        currency,
        country,
        resolvedAt:         resolvedAt.toISOString(),
      },
    ).catch(() => {/* fire-and-forget */});

    return bundle;
  }
}

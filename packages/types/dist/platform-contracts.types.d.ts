/**
 * platform-contracts.types.ts
 *
 * Shared type definitions for SPANCLE Platform Contracts.
 *
 * These are the immutable contract shapes produced by the Commercial Engine
 * and consumed by Finance (and future services).
 *
 * Rules:
 *   - Pure TypeScript interfaces only. No runtime values.
 *   - No imports from any service package.
 *   - All monetary values: INT minor currency units.
 *   - All rates: INT basis points (100 bps = 1%).
 *   - All dates: ISO-8601 strings.
 *
 * Contract version: 1.0.0
 */
export declare const PLATFORM_CONTRACT_VERSION: "1.0.0";
export type PlatformContractVersion = typeof PLATFORM_CONTRACT_VERSION;
export interface VersionedPlatformContract {
    readonly contractVersion: string;
    readonly generatedAt: string;
}
export declare function isPlatformContractVersionCompatible(received: string): boolean;
export interface EvaluatedRuleRef {
    readonly ruleVersionId: string;
    readonly ruleType: string;
    readonly outcome: string;
    readonly reason: string;
}
export interface PaymentInstruction extends VersionedPlatformContract {
    readonly kind: 'PaymentInstruction';
    readonly tenantId: string;
    readonly amountMinor: number;
    readonly currency: string;
    readonly preferredGatewayType: string | null;
    readonly billingCycle: string | null;
    readonly idempotencyKey: string;
    readonly isTrial: boolean;
    readonly trialDays: number | null;
    readonly trialPriceMinor: number | null;
    readonly discountBps: number;
    readonly maxDiscountMinor: number;
    readonly promotionCode: string | null;
    readonly taxCode: string | null;
    readonly taxRateBps: number | null;
}
export interface InvoiceLine {
    readonly description: string;
    readonly lineType: string;
    readonly quantity: number;
    readonly unitPriceMinor: number;
    readonly subtotalMinor: number;
    readonly discountMinor: number;
    readonly taxCode: string | null;
}
export interface InvoiceInstruction extends VersionedPlatformContract {
    readonly kind: 'InvoiceInstruction';
    readonly tenantId: string;
    readonly currency: string;
    readonly sourceType: string;
    readonly sourceId: string;
    readonly lines: ReadonlyArray<InvoiceLine>;
    readonly subtotalMinor: number;
    readonly discountMinor: number;
    readonly taxMinor: 0;
    readonly totalMinor: number;
    readonly packageSlug: string | null;
    readonly packageVersion: string | null;
    readonly planId: string | null;
    readonly tierKey: string | null;
    readonly idempotencyKey: string;
}
export interface SettlementInstruction extends VersionedPlatformContract {
    readonly kind: 'SettlementInstruction';
    readonly tenantId: string;
    readonly ownershipType: string;
    readonly platformFeeBps: number;
    readonly settlementDelaySeconds: number;
    readonly holdInEscrow: boolean;
    readonly currency: string;
}
export interface RevenueTier {
    readonly upToMinor: number | null;
    readonly rateBps: number;
}
export interface RevenueInstruction extends VersionedPlatformContract {
    readonly kind: 'RevenueInstruction';
    readonly tenantId: string;
    readonly distributionType: string;
    readonly tiers: ReadonlyArray<RevenueTier>;
    readonly currency: string;
    readonly estimatedPlatformAmountMinor: number;
    readonly transactionAmountMinor: number;
}
export interface CommercialDecisionContract extends VersionedPlatformContract {
    readonly kind: 'CommercialDecisionContract';
    readonly decisionId: string;
    readonly tenantId: string;
    readonly moduleId: string;
    readonly productId: string;
    readonly transactionType: string;
    readonly outcome: string;
    readonly reason: string;
    readonly productEligible: boolean;
    readonly planId: string | null;
    readonly packageId: string | null;
    readonly packageSlug: string | null;
    readonly packageVersion: string | null;
    readonly tierKey: string | null;
    readonly primaryRuleVersionId: string | null;
    readonly primaryRuleVersionSemver: string | null;
    readonly evaluatedRules: ReadonlyArray<EvaluatedRuleRef>;
    readonly appliedPolicyIds: ReadonlyArray<string>;
    readonly preferredGatewayType: string | null;
    readonly paymentInstruction: PaymentInstruction | null;
    readonly invoiceInstruction: InvoiceInstruction | null;
    readonly settlementInstruction: SettlementInstruction;
    readonly revenueInstruction: RevenueInstruction | null;
    readonly requestedAmountMinor: number;
    readonly currency: string;
    readonly country: string;
    readonly requestedAt: string;
}
/** Minimal envelope fields Finance needs for routing and deduplication. */
export interface PlatformContractEnvelopeHeader {
    readonly contractId: string;
    readonly contractVersion: string;
    readonly schemaVersion: string;
    readonly eventType: string;
    readonly sourceService: string;
    readonly correlationId: string;
    readonly traceId: string;
    readonly deduplicationKey: string;
    readonly occurredAt: string;
    readonly priority: string;
    readonly deliveryMode: string;
}
export interface PlatformContractEnvelope<TPayload = unknown> extends PlatformContractEnvelopeHeader {
    readonly payload: Readonly<TPayload>;
}
//# sourceMappingURL=platform-contracts.types.d.ts.map
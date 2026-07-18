/**
 * commercial-contract.builder.ts
 *
 * Assembles immutable CommercialDecisionContract and financial instruction
 * objects from a CommercialDecisionResult and its ResolvedPolicyBundle.
 *
 * This builder is the ONLY place where internal types are projected into
 * the public contract shape. No Finance imports. No side effects.
 * All outputs are readonly plain objects.
 */
import { COMMERCIAL_CONTRACT_VERSION } from './contract-version';
import type { CommercialDecisionContract, EvaluatedRuleRef } from './commercial-decision.contract';
import type {
  InvoiceInstruction,
  InvoiceLine,
  PaymentInstruction,
  RevenueInstruction,
  RevenueTier,
  SettlementInstruction,
} from './financial-instructions.contracts';
import type { CommercialDecisionResult } from '../interfaces/commercial-decision.interfaces';
import type { ResolvedPolicyBundle }     from '../interfaces/policy-resolver.interfaces';
import type { PackageAssignmentSnapshot } from '../policy/package-assignment.model';
import { PaymentOwnershipType }          from '../enums/commercial.enums';

// ── CommercialContractBuilder ─────────────────────────────────────────────────

export class CommercialContractBuilder {

  /**
   * Builds the complete CommercialDecisionContract from a decision result
   * and its resolved policy bundle.
   *
   * Called from CommercialDecisionService after the snapshot is written.
   * The resulting contract is emitted in the DECISION_GENERATED event payload.
   */
  static build(
    result: CommercialDecisionResult,
    bundle: Readonly<ResolvedPolicyBundle>,
  ): CommercialDecisionContract {
    const now = new Date().toISOString();
    const pkgSnap = result.snapshot.resultPayload['packageAssignment'] as PackageAssignmentSnapshot | null;
    const isAllowed = result.outcome === 'ALLOWED';

    const paymentInstruction  = isAllowed ? CommercialContractBuilder.buildPaymentInstruction(result, bundle) : null;
    const invoiceInstruction  = isAllowed ? CommercialContractBuilder.buildInvoiceInstruction(result, bundle, pkgSnap) : null;
    const settlementInstruction = CommercialContractBuilder.buildSettlementInstruction(result, bundle);
    const revenueInstruction  = CommercialContractBuilder.buildRevenueInstruction(result, bundle);

    const evaluatedRules: EvaluatedRuleRef[] =
      (result.snapshot.resultPayload['evaluatedRules'] as Array<{
        ruleVersionId: string; ruleType: string; outcome: string; reason: string;
      }> | undefined ?? []).map((e) => ({
        ruleVersionId: e.ruleVersionId,
        ruleType:      e.ruleType,
        outcome:       e.outcome,
        reason:        e.reason,
      }));

    const contract: CommercialDecisionContract = {
      contractVersion:    COMMERCIAL_CONTRACT_VERSION,
      generatedAt:        now,
      kind:               'CommercialDecisionContract',
      decisionId:         result.decisionId,
      tenantId:           result.tenantId,
      moduleId:           result.moduleId,
      productId:          result.productId,
      transactionType:    result.transactionType,
      outcome:            result.outcome,
      reason:             result.reason,
      productEligible:    result.productEligible,
      planId:             pkgSnap?.planId ?? null,
      packageId:          pkgSnap?.packageId ?? null,
      packageSlug:        pkgSnap?.packageSlug ?? null,
      packageVersion:     pkgSnap?.packageVersion ?? null,
      tierKey:            pkgSnap?.tierKey ?? null,
      primaryRuleVersionId:     result.snapshot.resultPayload['primaryRuleVersionId'] as string | null ?? null,
      primaryRuleVersionSemver: result.snapshot.resultPayload['primaryRuleVersionSemver'] as string | null ?? null,
      evaluatedRules,
      appliedPolicyIds:   result.appliedPolicyIds,
      preferredGatewayType: bundle.gatewayBundle?.primary?.definition.gatewayType ?? null,
      paymentInstruction,
      invoiceInstruction,
      settlementInstruction,
      revenueInstruction,
      requestedAmountMinor: result.snapshot.inputContext['amountMinor'] as number ?? 0,
      currency:            result.snapshot.inputContext['currency'] as string ?? '',
      country:             result.snapshot.inputContext['country'] as string ?? '',
      requestedAt:         result.snapshot.inputContext['requestedAt'] as string ?? now,
    };

    return Object.freeze(contract) as CommercialDecisionContract;
  }

  // ── PaymentInstruction ────────────────────────────────────────────────────

  private static buildPaymentInstruction(
    result: CommercialDecisionResult,
    bundle: Readonly<ResolvedPolicyBundle>,
  ): PaymentInstruction {
    const now          = new Date().toISOString();
    const amountMinor  = result.snapshot.inputContext['amountMinor'] as number ?? 0;
    const currency     = result.snapshot.inputContext['currency'] as string ?? '';
    const pricingRule  = bundle.ruleBundle?.pricingRules[0] ?? null;
    const discountRule = bundle.ruleBundle?.discountRules[0] ?? null;
    const promoRule    = bundle.ruleBundle?.promotionRules[0] ?? null;
    const trialRule    = bundle.ruleBundle?.trialRules[0] ?? null;
    const taxRule      = bundle.ruleBundle?.taxRules[0] ?? null;

    return Object.freeze({
      contractVersion:      COMMERCIAL_CONTRACT_VERSION,
      generatedAt:          now,
      kind:                 'PaymentInstruction' as const,
      tenantId:             result.tenantId,
      amountMinor:          pricingRule?.definition.basePriceMinor ?? amountMinor,
      currency:             pricingRule?.definition.currency ?? currency,
      preferredGatewayType: bundle.gatewayBundle?.primary?.definition.gatewayType ?? null,
      billingCycle:         pricingRule?.definition.billingCycle ?? null,
      idempotencyKey:       `commercial-payment-${result.decisionId}`,
      isTrial:              trialRule !== null,
      trialDays:            trialRule?.definition.trialDays ?? null,
      trialPriceMinor:      trialRule?.definition.trialPriceMinor ?? null,
      discountBps:          discountRule?.definition.discountBps ?? promoRule?.definition.discountBps ?? 0,
      maxDiscountMinor:     discountRule?.definition.maxDiscountMinor ?? -1,
      promotionCode:        promoRule?.definition.promotionCode ?? null,
      taxCode:              taxRule?.definition.taxCode ?? null,
      taxRateBps:           taxRule?.definition.rateBps ?? null,
    });
  }

  // ── InvoiceInstruction ────────────────────────────────────────────────────

  private static buildInvoiceInstruction(
    result:    CommercialDecisionResult,
    bundle:    Readonly<ResolvedPolicyBundle>,
    pkgSnap:   PackageAssignmentSnapshot | null,
  ): InvoiceInstruction {
    const now         = new Date().toISOString();
    const currency    = result.snapshot.inputContext['currency'] as string ?? '';
    const pricingRule = bundle.ruleBundle?.pricingRules[0] ?? null;
    const discRule    = bundle.ruleBundle?.discountRules[0] ?? null;

    const unitPriceMinor = pricingRule?.definition.basePriceMinor ?? 0;
    const discountMinor  = discRule
      ? Math.min(
          Math.floor((unitPriceMinor * discRule.definition.discountBps) / 10000),
          discRule.definition.maxDiscountMinor === -1 ? unitPriceMinor : discRule.definition.maxDiscountMinor,
        )
      : 0;
    const subtotalMinor  = unitPriceMinor - discountMinor;

    const lines: InvoiceLine[] = pricingRule ? [{
      description:    `${pkgSnap?.packageSlug ?? 'Subscription'} — ${pkgSnap?.tierKey ?? 'standard'}`,
      lineType:       'subscription',
      quantity:       1,
      unitPriceMinor,
      subtotalMinor,
      discountMinor,
      taxCode:        bundle.ruleBundle?.taxRules[0]?.definition.taxCode ?? null,
    }] : [];

    return Object.freeze({
      contractVersion:  COMMERCIAL_CONTRACT_VERSION,
      generatedAt:      now,
      kind:             'InvoiceInstruction' as const,
      tenantId:         result.tenantId,
      currency,
      sourceType:       'commercial_decision',
      sourceId:         result.decisionId,
      lines:            Object.freeze(lines),
      subtotalMinor,
      discountMinor,
      taxMinor:         0 as const,
      totalMinor:       subtotalMinor,
      packageSlug:      pkgSnap?.packageSlug ?? null,
      packageVersion:   pkgSnap?.packageVersion ?? null,
      planId:           pkgSnap?.planId ?? null,
      tierKey:          pkgSnap?.tierKey ?? null,
      idempotencyKey:   `commercial-invoice-${result.decisionId}`,
    });
  }

  // ── SettlementInstruction ─────────────────────────────────────────────────

  private static buildSettlementInstruction(
    result: CommercialDecisionResult,
    bundle: Readonly<ResolvedPolicyBundle>,
  ): SettlementInstruction {
    const now      = new Date().toISOString();
    const currency = result.snapshot.inputContext['currency'] as string ?? '';
    const policy   = bundle.ownershipPolicies[0] ?? null;

    return Object.freeze({
      contractVersion:         COMMERCIAL_CONTRACT_VERSION,
      generatedAt:             now,
      kind:                    'SettlementInstruction' as const,
      tenantId:                result.tenantId,
      ownershipType:           policy?.ownershipType ?? PaymentOwnershipType.PLATFORM,
      platformFeeBps:          policy?.platformShareBps ?? 0,
      settlementDelaySeconds:  0,
      holdInEscrow:            false,
      currency,
    });
  }

  // ── RevenueInstruction ────────────────────────────────────────────────────

  private static buildRevenueInstruction(
    result: CommercialDecisionResult,
    bundle: Readonly<ResolvedPolicyBundle>,
  ): RevenueInstruction | null {
    const policy = bundle.distributionPolicies[0] ?? null;
    if (!policy) return null;

    const now           = new Date().toISOString();
    const currency      = result.snapshot.inputContext['currency'] as string ?? '';
    const amountMinor   = result.snapshot.inputContext['amountMinor'] as number ?? 0;

    const tiers: RevenueTier[] = policy.tiers.map((t) => ({
      upToMinor: t.upToMinor,
      rateBps:   t.rateBps,
    }));

    // Compute estimated platform amount from first applicable tier
    const applicableTier = tiers.find(
      (t) => t.upToMinor === null || amountMinor <= t.upToMinor,
    ) ?? tiers[tiers.length - 1];

    const estimatedPlatformAmountMinor = applicableTier
      ? Math.floor((amountMinor * applicableTier.rateBps) / 10000)
      : 0;

    return Object.freeze({
      contractVersion:                COMMERCIAL_CONTRACT_VERSION,
      generatedAt:                    now,
      kind:                           'RevenueInstruction' as const,
      tenantId:                       result.tenantId,
      distributionType:               policy.distributionType,
      tiers:                          Object.freeze(tiers),
      currency,
      estimatedPlatformAmountMinor,
      transactionAmountMinor:         amountMinor,
    });
  }
}

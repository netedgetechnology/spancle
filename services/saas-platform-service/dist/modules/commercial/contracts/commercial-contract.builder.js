"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialContractBuilder = void 0;
const contract_version_1 = require("./contract-version");
const commercial_enums_1 = require("../enums/commercial.enums");
class CommercialContractBuilder {
    static build(result, bundle) {
        const now = new Date().toISOString();
        const pkgSnap = result.snapshot.resultPayload['packageAssignment'];
        const isAllowed = result.outcome === 'ALLOWED';
        const paymentInstruction = isAllowed ? CommercialContractBuilder.buildPaymentInstruction(result, bundle) : null;
        const invoiceInstruction = isAllowed ? CommercialContractBuilder.buildInvoiceInstruction(result, bundle, pkgSnap) : null;
        const settlementInstruction = CommercialContractBuilder.buildSettlementInstruction(result, bundle);
        const revenueInstruction = CommercialContractBuilder.buildRevenueInstruction(result, bundle);
        const evaluatedRules = (result.snapshot.resultPayload['evaluatedRules'] ?? []).map((e) => ({
            ruleVersionId: e.ruleVersionId,
            ruleType: e.ruleType,
            outcome: e.outcome,
            reason: e.reason,
        }));
        const contract = {
            contractVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
            generatedAt: now,
            kind: 'CommercialDecisionContract',
            decisionId: result.decisionId,
            tenantId: result.tenantId,
            moduleId: result.moduleId,
            productId: result.productId,
            transactionType: result.transactionType,
            outcome: result.outcome,
            reason: result.reason,
            productEligible: result.productEligible,
            planId: pkgSnap?.planId ?? null,
            packageId: pkgSnap?.packageId ?? null,
            packageSlug: pkgSnap?.packageSlug ?? null,
            packageVersion: pkgSnap?.packageVersion ?? null,
            tierKey: pkgSnap?.tierKey ?? null,
            primaryRuleVersionId: result.snapshot.resultPayload['primaryRuleVersionId'] ?? null,
            primaryRuleVersionSemver: result.snapshot.resultPayload['primaryRuleVersionSemver'] ?? null,
            evaluatedRules,
            appliedPolicyIds: result.appliedPolicyIds,
            preferredGatewayType: bundle.gatewayBundle?.primary?.definition.gatewayType ?? null,
            paymentInstruction,
            invoiceInstruction,
            settlementInstruction,
            revenueInstruction,
            requestedAmountMinor: result.snapshot.inputContext['amountMinor'] ?? 0,
            currency: result.snapshot.inputContext['currency'] ?? '',
            country: result.snapshot.inputContext['country'] ?? '',
            requestedAt: result.snapshot.inputContext['requestedAt'] ?? now,
        };
        return Object.freeze(contract);
    }
    static buildPaymentInstruction(result, bundle) {
        const now = new Date().toISOString();
        const amountMinor = result.snapshot.inputContext['amountMinor'] ?? 0;
        const currency = result.snapshot.inputContext['currency'] ?? '';
        const pricingRule = bundle.ruleBundle?.pricingRules[0] ?? null;
        const discountRule = bundle.ruleBundle?.discountRules[0] ?? null;
        const promoRule = bundle.ruleBundle?.promotionRules[0] ?? null;
        const trialRule = bundle.ruleBundle?.trialRules[0] ?? null;
        const taxRule = bundle.ruleBundle?.taxRules[0] ?? null;
        return Object.freeze({
            contractVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
            generatedAt: now,
            kind: 'PaymentInstruction',
            tenantId: result.tenantId,
            amountMinor: pricingRule?.definition.basePriceMinor ?? amountMinor,
            currency: pricingRule?.definition.currency ?? currency,
            preferredGatewayType: bundle.gatewayBundle?.primary?.definition.gatewayType ?? null,
            billingCycle: pricingRule?.definition.billingCycle ?? null,
            idempotencyKey: `commercial-payment-${result.decisionId}`,
            isTrial: trialRule !== null,
            trialDays: trialRule?.definition.trialDays ?? null,
            trialPriceMinor: trialRule?.definition.trialPriceMinor ?? null,
            discountBps: discountRule?.definition.discountBps ?? promoRule?.definition.discountBps ?? 0,
            maxDiscountMinor: discountRule?.definition.maxDiscountMinor ?? -1,
            promotionCode: promoRule?.definition.promotionCode ?? null,
            taxCode: taxRule?.definition.taxCode ?? null,
            taxRateBps: taxRule?.definition.rateBps ?? null,
        });
    }
    static buildInvoiceInstruction(result, bundle, pkgSnap) {
        const now = new Date().toISOString();
        const currency = result.snapshot.inputContext['currency'] ?? '';
        const pricingRule = bundle.ruleBundle?.pricingRules[0] ?? null;
        const discRule = bundle.ruleBundle?.discountRules[0] ?? null;
        const unitPriceMinor = pricingRule?.definition.basePriceMinor ?? 0;
        const discountMinor = discRule
            ? Math.min(Math.floor((unitPriceMinor * discRule.definition.discountBps) / 10000), discRule.definition.maxDiscountMinor === -1 ? unitPriceMinor : discRule.definition.maxDiscountMinor)
            : 0;
        const subtotalMinor = unitPriceMinor - discountMinor;
        const lines = pricingRule ? [{
                description: `${pkgSnap?.packageSlug ?? 'Subscription'} — ${pkgSnap?.tierKey ?? 'standard'}`,
                lineType: 'subscription',
                quantity: 1,
                unitPriceMinor,
                subtotalMinor,
                discountMinor,
                taxCode: bundle.ruleBundle?.taxRules[0]?.definition.taxCode ?? null,
            }] : [];
        return Object.freeze({
            contractVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
            generatedAt: now,
            kind: 'InvoiceInstruction',
            tenantId: result.tenantId,
            currency,
            sourceType: 'commercial_decision',
            sourceId: result.decisionId,
            lines: Object.freeze(lines),
            subtotalMinor,
            discountMinor,
            taxMinor: 0,
            totalMinor: subtotalMinor,
            packageSlug: pkgSnap?.packageSlug ?? null,
            packageVersion: pkgSnap?.packageVersion ?? null,
            planId: pkgSnap?.planId ?? null,
            tierKey: pkgSnap?.tierKey ?? null,
            idempotencyKey: `commercial-invoice-${result.decisionId}`,
        });
    }
    static buildSettlementInstruction(result, bundle) {
        const now = new Date().toISOString();
        const currency = result.snapshot.inputContext['currency'] ?? '';
        const policy = bundle.ownershipPolicies[0] ?? null;
        return Object.freeze({
            contractVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
            generatedAt: now,
            kind: 'SettlementInstruction',
            tenantId: result.tenantId,
            ownershipType: policy?.ownershipType ?? commercial_enums_1.PaymentOwnershipType.PLATFORM,
            platformFeeBps: policy?.platformShareBps ?? 0,
            settlementDelaySeconds: 0,
            holdInEscrow: false,
            currency,
        });
    }
    static buildRevenueInstruction(result, bundle) {
        const policy = bundle.distributionPolicies[0] ?? null;
        if (!policy)
            return null;
        const now = new Date().toISOString();
        const currency = result.snapshot.inputContext['currency'] ?? '';
        const amountMinor = result.snapshot.inputContext['amountMinor'] ?? 0;
        const tiers = policy.tiers.map((t) => ({
            upToMinor: t.upToMinor,
            rateBps: t.rateBps,
        }));
        const applicableTier = tiers.find((t) => t.upToMinor === null || amountMinor <= t.upToMinor) ?? tiers[tiers.length - 1];
        const estimatedPlatformAmountMinor = applicableTier
            ? Math.floor((amountMinor * applicableTier.rateBps) / 10000)
            : 0;
        return Object.freeze({
            contractVersion: contract_version_1.COMMERCIAL_CONTRACT_VERSION,
            generatedAt: now,
            kind: 'RevenueInstruction',
            tenantId: result.tenantId,
            distributionType: policy.distributionType,
            tiers: Object.freeze(tiers),
            currency,
            estimatedPlatformAmountMinor,
            transactionAmountMinor: amountMinor,
        });
    }
}
exports.CommercialContractBuilder = CommercialContractBuilder;
//# sourceMappingURL=commercial-contract.builder.js.map
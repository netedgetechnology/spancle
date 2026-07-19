/**
 * platform-contract-mapper.ts
 *
 * Pure, deterministic mapper: Platform Contract → Finance Internal Commands.
 *
 * Rules:
 *   - No database access
 *   - No async operations
 *   - No side effects
 *   - All outputs are immutable (Object.freeze)
 *   - Input types come from @spancle/types (no Commercial service imports)
 *   - Output types are Finance commands — no Commercial terminology in commands
 *
 * The mapping produces a FinanceCommandBatch containing all commands derived
 * from a single CommercialDecisionContract envelope. Commands that cannot be
 * derived (e.g. null paymentInstruction) produce null entries.
 */
import type {
  CommercialDecisionContract,
  InvoiceInstruction,
  PaymentInstruction,
  RevenueInstruction,
  SettlementInstruction,
  PlatformContractEnvelope,
} from '@spancle/types';

import type {
  CreateFinancialTransactionCommand,
  CreateInvoiceCommand,
  CreatePaymentCommand,
  CreateRevenueDistributionCommand,
  CreateSettlementCommand,
  FinanceCommandBatch,
  InvoiceLineCommand,
  RevenueTierCommand,
} from './commands/finance.commands';

// ── Accounting period derivation ──────────────────────────────────────────────

/**
 * Derives the YYYY-MM accounting period from an ISO-8601 date string.
 * Falls back to the current month when the date is unparseable.
 */
function toAccountingPeriod(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ── PlatformContractMapper ────────────────────────────────────────────────────

export class PlatformContractMapper {

  /**
   * Maps a CommercialDecisionContract envelope to a FinanceCommandBatch.
   *
   * @param envelope  The validated platform contract envelope.
   * @returns         Frozen FinanceCommandBatch.
   *
   * This is a pure function — same input always produces same output.
   * No state is read or mutated.
   */
  static map(
    envelope: Readonly<PlatformContractEnvelope<CommercialDecisionContract>>,
  ): FinanceCommandBatch {
    const contract = envelope.payload;
    const isAllowed = contract.outcome === 'ALLOWED';

    const transaction = PlatformContractMapper.mapTransaction(envelope);
    const invoice     = isAllowed && contract.invoiceInstruction
      ? PlatformContractMapper.mapInvoice(contract.invoiceInstruction, envelope.deduplicationKey)
      : null;
    const payment     = isAllowed && contract.paymentInstruction
      ? PlatformContractMapper.mapPayment(contract.paymentInstruction, envelope.deduplicationKey)
      : null;
    const settlement  = PlatformContractMapper.mapSettlement(
      contract.settlementInstruction,
      envelope.deduplicationKey,
    );
    const revenueDistribution = contract.revenueInstruction
      ? PlatformContractMapper.mapRevenue(contract.revenueInstruction, envelope.deduplicationKey)
      : null;

    const batch: FinanceCommandBatch = {
      envelopeId:          envelope.contractId,
      deduplicationKey:    envelope.deduplicationKey,
      correlationId:       envelope.correlationId,
      transaction:         Object.freeze(transaction),
      invoice:             invoice ? Object.freeze(invoice) : null,
      payment:             payment ? Object.freeze(payment) : null,
      settlement:          Object.freeze(settlement),
      revenueDistribution: revenueDistribution ? Object.freeze(revenueDistribution) : null,
      mappedAt:            new Date().toISOString(),
    };

    return Object.freeze(batch);
  }

  // ── Private mapping methods ───────────────────────────────────────────────

  private static mapTransaction(
    envelope: Readonly<PlatformContractEnvelope<CommercialDecisionContract>>,
  ): CreateFinancialTransactionCommand {
    const c = envelope.payload;
    const packageLabel = c.packageSlug && c.packageVersion
      ? `${c.packageSlug}@${c.packageVersion}`
      : null;

    return {
      kind:             'CreateFinancialTransactionCommand',
      tenantId:         c.tenantId,
      transactionType:  'COMMERCIAL_DECISION',
      amountMinor:      c.requestedAmountMinor,
      currency:         c.currency,
      idempotencyKey:   `finance-tx-${envelope.deduplicationKey}`,
      sourceType:       'platform_contract',
      sourceReference:  envelope.contractId,
      country:          c.country,
      accountingPeriod: toAccountingPeriod(c.requestedAt),
      description:      [
        `Commercial decision ${c.decisionId}`,
        packageLabel ? `(${packageLabel})` : null,
        c.outcome === 'DENIED' ? '[DENIED]' : null,
      ].filter(Boolean).join(' '),
      requestedAt:      c.requestedAt,
    };
  }

  private static mapPayment(
    pi:              Readonly<PaymentInstruction>,
    deduplicationKey: string,
  ): CreatePaymentCommand {
    return {
      kind:                  'CreatePaymentCommand',
      tenantId:              pi.tenantId,
      amountMinor:           pi.amountMinor,
      currency:              pi.currency,
      idempotencyKey:        `finance-pay-${deduplicationKey}`,
      preferredGatewayHint:  pi.preferredGatewayType,
      billingCycle:          pi.billingCycle,
      isTrial:               pi.isTrial,
      trialDays:             pi.trialDays,
      trialAmountMinor:      pi.trialPriceMinor,
      appliedDiscountMinor:  Math.max(0,
        pi.maxDiscountMinor === -1
          ? Math.floor((pi.amountMinor * pi.discountBps) / 10000)
          : Math.min(
              Math.floor((pi.amountMinor * pi.discountBps) / 10000),
              pi.maxDiscountMinor,
            )
      ),
      taxCode:               pi.taxCode,
      sourceReference:       pi.idempotencyKey,
    };
  }

  private static mapInvoice(
    ii:              Readonly<InvoiceInstruction>,
    deduplicationKey: string,
  ): CreateInvoiceCommand {
    const lines: InvoiceLineCommand[] = ii.lines.map((l) => Object.freeze({
      description:    l.description,
      lineType:       l.lineType,
      quantity:       l.quantity,
      unitPriceMinor: l.unitPriceMinor,
      subtotalMinor:  l.subtotalMinor,
      discountMinor:  l.discountMinor,
      taxCode:        l.taxCode,
    }));

    const packageLabel = ii.packageSlug && ii.packageVersion
      ? `${ii.packageSlug}@${ii.packageVersion}`
      : null;

    return {
      kind:             'CreateInvoiceCommand',
      tenantId:         ii.tenantId,
      currency:         ii.currency,
      idempotencyKey:   `finance-inv-${deduplicationKey}`,
      lines:            Object.freeze(lines),
      subtotalMinor:    ii.subtotalMinor,
      discountMinor:    ii.discountMinor,
      taxMinor:         0,
      totalMinor:       ii.totalMinor,
      sourceReference:  ii.idempotencyKey,
      packageLabel,
      planId:           ii.planId,
    };
  }

  private static mapSettlement(
    si:              Readonly<SettlementInstruction>,
    deduplicationKey: string,
  ): CreateSettlementCommand {
    const ownershipType = (['PLATFORM', 'TENANT', 'SPLIT'] as const).includes(
      si.ownershipType as 'PLATFORM' | 'TENANT' | 'SPLIT',
    ) ? (si.ownershipType as 'PLATFORM' | 'TENANT' | 'SPLIT') : 'PLATFORM';

    return {
      kind:                    'CreateSettlementCommand',
      tenantId:                si.tenantId,
      currency:                si.currency,
      idempotencyKey:          `finance-set-${deduplicationKey}`,
      ownershipType,
      platformFeeBps:          si.platformFeeBps,
      settlementDelaySeconds:  si.settlementDelaySeconds,
      holdInEscrow:            si.holdInEscrow,
      sourceReference:         deduplicationKey,
    };
  }

  private static mapRevenue(
    ri:              Readonly<RevenueInstruction>,
    deduplicationKey: string,
  ): CreateRevenueDistributionCommand {
    const tiers: RevenueTierCommand[] = ri.tiers.map((t) =>
      Object.freeze({ upToMinor: t.upToMinor, rateBps: t.rateBps }),
    );

    return {
      kind:                         'CreateRevenueDistributionCommand',
      tenantId:                     ri.tenantId,
      currency:                     ri.currency,
      idempotencyKey:               `finance-rev-${deduplicationKey}`,
      distributionType:             ri.distributionType,
      tiers:                        Object.freeze(tiers),
      transactionAmountMinor:       ri.transactionAmountMinor,
      estimatedPlatformAmountMinor: ri.estimatedPlatformAmountMinor,
      sourceReference:              deduplicationKey,
    };
  }
}

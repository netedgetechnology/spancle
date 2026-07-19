/**
 * posting-policy.ts
 *
 * IPostingPolicy — contract for a posting policy.
 * DefaultPostingPolicy implementations — one per Finance command kind.
 *
 * A posting policy:
 *   1. Validates the command fields (no business logic — structural only)
 *   2. Produces posting instructions (the double-entry accounting intent)
 *   3. Returns a PostingResult
 *
 * Rules:
 *   - No database access
 *   - No repositories
 *   - No async I/O
 *   - No persistence
 *   - Pure functions (same input → same output)
 *   - All instructions must be balanced (∑ DR = ∑ CR)
 *
 * Account codes used (Finance domain, not Commercial):
 *   1000  Cash / Receivable
 *   2000  Accounts Payable
 *   3000  Platform Revenue
 *   4000  Tenant Revenue
 *   5000  Discount Expense
 *   6000  Settlement Liability
 *   7000  Revenue Share Payable
 */
import {
  type PostingInstruction,
  type PostingPlan,
  type PostingType,
  createPostingPlan,
} from './posting-plan.model';
import {
  type PostingResult,
  type PostingValidationError,
  postingError,
  postingPlanCreated,
  postingRejected,
} from './posting-result.model';
import type {
  CreatePaymentCommand,
  CreateInvoiceCommand,
  CreateSettlementCommand,
  CreateRevenueDistributionCommand,
  CreateFinancialTransactionCommand,
} from '../intake/commands/finance.commands';

// ── IPostingPolicy ────────────────────────────────────────────────────────────

export interface IPostingPolicy<TCommand> {
  /** Returns true when this policy can handle the given command. */
  canHandle(command: unknown): command is TCommand;

  /**
   * Validates and produces a PostingResult for the given command.
   * Never throws. Never accesses database or repositories.
   */
  apply(command: TCommand): PostingResult;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function positiveInt(name: string, value: unknown): PostingValidationError | null {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    return postingError(name, `"${name}" must be a positive integer; received ${value}`);
  }
  return null;
}

function nonEmptyString(name: string, value: unknown): PostingValidationError | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return postingError(name, `"${name}" is required and must be a non-empty string`);
  }
  return null;
}

function plan(
  kind:        PostingType,
  command:     { tenantId: string; currency: string; idempotencyKey: string; sourceReference: string },
  period:      string,
  description: string,
  instructions: PostingInstruction[],
): PostingResult {
  const p = createPostingPlan({
    planId:           `plan-${command.idempotencyKey}`,
    tenantId:         command.tenantId,
    postingType:      kind,
    accountingPeriod: period,
    currency:         command.currency,
    sourceReference:  command.sourceReference,
    description,
    instructions,
  });
  if (!p.isBalanced) {
    return postingRejected('UNBALANCED_PLAN', [
      postingError('instructions',
        `∑ DR (${p.totalDebitMinor}) ≠ ∑ CR (${p.totalCreditMinor}) for ${kind}`),
    ]);
  }
  return postingPlanCreated(p);
}

// ── PaymentPostingPolicy ──────────────────────────────────────────────────────

/**
 * PAYMENT_RECEIPT posting plan:
 *
 *   DR  1000 Cash/Receivable      amountMinor
 *   CR  3000 Platform Revenue     amountMinor - discountMinor
 *   CR  5000 Discount Expense     discountMinor   (when > 0)
 *
 * If trial: DR 1000 / CR 3000 at trialAmountMinor instead.
 */
export class PaymentPostingPolicy implements IPostingPolicy<CreatePaymentCommand> {
  canHandle(c: unknown): c is CreatePaymentCommand {
    return (c as CreatePaymentCommand)?.kind === 'CreatePaymentCommand';
  }

  apply(cmd: CreatePaymentCommand): PostingResult {
    const errs: PostingValidationError[] = [];
    const amount = cmd.isTrial ? (cmd.trialAmountMinor ?? 0) : cmd.amountMinor;

    const e1 = positiveInt('amountMinor', amount);
    if (e1) errs.push(e1);
    const e2 = nonEmptyString('currency', cmd.currency);
    if (e2) errs.push(e2);
    const e3 = nonEmptyString('tenantId', cmd.tenantId);
    if (e3) errs.push(e3);

    if (errs.length) return postingRejected('VALIDATION_FAILURE', errs);
    if (amount === 0) return postingRejected('ZERO_AMOUNT', [postingError('amountMinor', 'Payment amount is zero')]);

    const discount = Math.max(0, cmd.appliedDiscountMinor);
    const revenue  = amount - discount;
    const currency = cmd.currency;
    const period   = derivePeriod();

    const instructions: PostingInstruction[] = [
      { accountCode: '1000', side: 'DEBIT',  amountMinor: amount,   currency, description: `Payment received ${cmd.idempotencyKey}` },
      { accountCode: '3000', side: 'CREDIT', amountMinor: revenue,  currency, description: `Revenue from payment ${cmd.idempotencyKey}` },
    ];
    if (discount > 0) {
      instructions.push({ accountCode: '5000', side: 'CREDIT', amountMinor: discount, currency, description: `Discount applied ${cmd.idempotencyKey}` });
    }

    return plan('PAYMENT_RECEIPT', cmd, period, `Payment receipt for ${cmd.sourceReference}`, instructions);
  }
}

// ── InvoicePostingPolicy ──────────────────────────────────────────────────────

/**
 * INVOICE_REVENUE posting plan:
 *
 *   DR  2000 Accounts Payable / Receivable   totalMinor
 *   CR  4000 Tenant Revenue                  subtotalMinor
 *   CR  5000 Discount Expense                discountMinor  (when > 0)
 *
 * Tax (taxMinor) is always 0 — Finance applies TaxResolver separately.
 */
export class InvoicePostingPolicy implements IPostingPolicy<CreateInvoiceCommand> {
  canHandle(c: unknown): c is CreateInvoiceCommand {
    return (c as CreateInvoiceCommand)?.kind === 'CreateInvoiceCommand';
  }

  apply(cmd: CreateInvoiceCommand): PostingResult {
    const errs: PostingValidationError[] = [];

    if (!cmd.lines || cmd.lines.length === 0)
      errs.push(postingError('lines', 'Invoice must have at least one line'));
    const e1 = nonEmptyString('currency', cmd.currency);
    if (e1) errs.push(e1);
    const e2 = nonEmptyString('tenantId', cmd.tenantId);
    if (e2) errs.push(e2);

    if (errs.length) return postingRejected('VALIDATION_FAILURE', errs);
    if (cmd.totalMinor === 0) return postingRejected('ZERO_AMOUNT', [postingError('totalMinor', 'Invoice total is zero')]);
    if (cmd.totalMinor < 0)  return postingRejected('NEGATIVE_AMOUNT', [postingError('totalMinor', `Invoice total is negative: ${cmd.totalMinor}`)]);

    const currency = cmd.currency;
    const period   = derivePeriod();

    const instructions: PostingInstruction[] = [
      { accountCode: '2000', side: 'DEBIT',  amountMinor: cmd.totalMinor,    currency, description: `Invoice receivable ${cmd.idempotencyKey}` },
      { accountCode: '4000', side: 'CREDIT', amountMinor: cmd.subtotalMinor, currency, description: `Invoice revenue ${cmd.idempotencyKey}` },
    ];
    if (cmd.discountMinor > 0) {
      instructions.push({ accountCode: '5000', side: 'CREDIT', amountMinor: cmd.discountMinor, currency, description: `Invoice discount ${cmd.idempotencyKey}` });
    }

    return plan('INVOICE_REVENUE', cmd, period, `Invoice revenue for ${cmd.sourceReference}`, instructions);
  }
}

// ── SettlementPostingPolicy ───────────────────────────────────────────────────

/**
 * SETTLEMENT posting plan:
 *
 *   PLATFORM-owned:
 *     DR  6000 Settlement Liability   100% of amount
 *     CR  1000 Cash / Receivable      100% of amount
 *
 *   TENANT-owned:
 *     DR  6000 Settlement Liability   100% of amount
 *     CR  2000 Accounts Payable       amount (tenanted payout)
 *
 *   SPLIT: amount splits at platformFeeBps
 *     DR  6000 Settlement Liability   100%
 *     CR  1000 Cash/Receivable        platform share
 *     CR  2000 Accounts Payable       tenant share
 *
 * Amount is derived from the original transaction via sourceReference.
 * For the plan, we use amountMinor=1 as a structural placeholder —
 * the actual amount is resolved by the Ledger Posting Engine from
 * the linked CreateFinancialTransactionCommand.
 *
 * In this phase, the plan carries ownership type and fee structure
 * rather than a concrete amount (settlement amount not yet available).
 * We derive a structural plan using platformFeeBps.
 */
export class SettlementPostingPolicy implements IPostingPolicy<CreateSettlementCommand> {
  canHandle(c: unknown): c is CreateSettlementCommand {
    return (c as CreateSettlementCommand)?.kind === 'CreateSettlementCommand';
  }

  apply(cmd: CreateSettlementCommand): PostingResult {
    const errs: PostingValidationError[] = [];
    const e1 = nonEmptyString('currency', cmd.currency);
    if (e1) errs.push(e1);
    const e2 = nonEmptyString('tenantId', cmd.tenantId);
    if (e2) errs.push(e2);
    if (cmd.platformFeeBps < 0 || cmd.platformFeeBps > 10000)
      errs.push(postingError('platformFeeBps', `Must be 0–10000; received ${cmd.platformFeeBps}`));

    if (errs.length) return postingRejected('VALIDATION_FAILURE', errs);

    const currency = cmd.currency;
    const period   = derivePeriod();
    // Structural placeholder amount: 10000 minor units — actual resolved by Ledger Engine
    const PLACEHOLDER = 10000;

    let instructions: PostingInstruction[];

    if (cmd.ownershipType === 'PLATFORM') {
      instructions = [
        { accountCode: '6000', side: 'DEBIT',  amountMinor: PLACEHOLDER, currency, description: `Settlement liability ${cmd.idempotencyKey}` },
        { accountCode: '1000', side: 'CREDIT', amountMinor: PLACEHOLDER, currency, description: `Platform cash settlement ${cmd.idempotencyKey}` },
      ];
    } else if (cmd.ownershipType === 'TENANT') {
      instructions = [
        { accountCode: '6000', side: 'DEBIT',  amountMinor: PLACEHOLDER, currency, description: `Settlement liability ${cmd.idempotencyKey}` },
        { accountCode: '2000', side: 'CREDIT', amountMinor: PLACEHOLDER, currency, description: `Tenant payout ${cmd.idempotencyKey}` },
      ];
    } else {
      // SPLIT: platform share + tenant share
      const platformShare = Math.floor((PLACEHOLDER * cmd.platformFeeBps) / 10000);
      const tenantShare   = PLACEHOLDER - platformShare;
      instructions = [
        { accountCode: '6000', side: 'DEBIT',  amountMinor: PLACEHOLDER,    currency, description: `Settlement liability ${cmd.idempotencyKey}` },
        { accountCode: '1000', side: 'CREDIT', amountMinor: platformShare,  currency, description: `Platform share ${cmd.idempotencyKey}` },
        { accountCode: '2000', side: 'CREDIT', amountMinor: tenantShare,    currency, description: `Tenant share ${cmd.idempotencyKey}` },
      ];
    }

    return plan('SETTLEMENT', cmd, period, `Settlement for ${cmd.sourceReference}`, instructions);
  }
}

// ── RevenueDistributionPostingPolicy ─────────────────────────────────────────

/**
 * REVENUE_DISTRIBUTION posting plan:
 *
 *   DR  4000 Revenue                          transactionAmountMinor
 *   CR  3000 Platform Revenue                 estimatedPlatformAmountMinor
 *   CR  7000 Revenue Share Payable (tenant)   remainder
 */
export class RevenueDistributionPostingPolicy
  implements IPostingPolicy<CreateRevenueDistributionCommand> {

  canHandle(c: unknown): c is CreateRevenueDistributionCommand {
    return (c as CreateRevenueDistributionCommand)?.kind === 'CreateRevenueDistributionCommand';
  }

  apply(cmd: CreateRevenueDistributionCommand): PostingResult {
    const errs: PostingValidationError[] = [];
    const e1 = positiveInt('transactionAmountMinor', cmd.transactionAmountMinor);
    if (e1) errs.push(e1);
    const e2 = nonEmptyString('currency', cmd.currency);
    if (e2) errs.push(e2);
    if (cmd.estimatedPlatformAmountMinor < 0)
      errs.push(postingError('estimatedPlatformAmountMinor', 'Cannot be negative'));
    if (errs.length) return postingRejected('VALIDATION_FAILURE', errs);

    const currency    = cmd.currency;
    const period      = derivePeriod();
    const total       = cmd.transactionAmountMinor;
    const platform    = cmd.estimatedPlatformAmountMinor;
    const tenantShare = total - platform;

    if (tenantShare < 0)
      return postingRejected('VALIDATION_FAILURE', [
        postingError('estimatedPlatformAmountMinor', `Platform share ${platform} exceeds total ${total}`),
      ]);

    const instructions: PostingInstruction[] = [
      { accountCode: '4000', side: 'DEBIT',  amountMinor: total,       currency, description: `Revenue distribution source ${cmd.idempotencyKey}` },
      { accountCode: '3000', side: 'CREDIT', amountMinor: platform,    currency, description: `Platform revenue share ${cmd.idempotencyKey}` },
      { accountCode: '7000', side: 'CREDIT', amountMinor: tenantShare, currency, description: `Tenant revenue share payable ${cmd.idempotencyKey}` },
    ];

    return plan('REVENUE_DISTRIBUTION', cmd, period, `Revenue distribution for ${cmd.sourceReference}`, instructions);
  }
}

// ── FinancialTransactionPostingPolicy ─────────────────────────────────────────

/**
 * Structural posting plan for a CreateFinancialTransactionCommand.
 * Used when the engine receives a standalone transaction command
 * (rather than a full FinanceCommandBatch).
 *
 *   DR  1000 Receivable   amountMinor
 *   CR  3000 Revenue      amountMinor
 */
export class FinancialTransactionPostingPolicy
  implements IPostingPolicy<CreateFinancialTransactionCommand> {

  canHandle(c: unknown): c is CreateFinancialTransactionCommand {
    return (c as CreateFinancialTransactionCommand)?.kind === 'CreateFinancialTransactionCommand';
  }

  apply(cmd: CreateFinancialTransactionCommand): PostingResult {
    const errs: PostingValidationError[] = [];
    const e1 = positiveInt('amountMinor', cmd.amountMinor);
    if (e1) errs.push(e1);
    const e2 = nonEmptyString('currency', cmd.currency);
    if (e2) errs.push(e2);
    const e3 = nonEmptyString('accountingPeriod', cmd.accountingPeriod);
    if (e3) errs.push(e3);
    if (errs.length) return postingRejected('VALIDATION_FAILURE', errs);

    const currency = cmd.currency;

    const instructions: PostingInstruction[] = [
      { accountCode: '1000', side: 'DEBIT',  amountMinor: cmd.amountMinor, currency, description: `Transaction receivable ${cmd.idempotencyKey}` },
      { accountCode: '3000', side: 'CREDIT', amountMinor: cmd.amountMinor, currency, description: `Transaction revenue ${cmd.idempotencyKey}` },
    ];

    return plan('PAYMENT_RECEIPT', cmd, cmd.accountingPeriod,
      `Financial transaction ${cmd.sourceReference}`, instructions);
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function derivePeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

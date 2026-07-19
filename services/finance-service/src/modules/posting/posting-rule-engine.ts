/**
 * posting-rule-engine.ts
 *
 * PostingRuleEngine — accepts a Finance command, selects the appropriate
 * PostingPolicy, and returns an immutable PostingResult.
 *
 * No database. No repositories. No async I/O. No persistence.
 * Pure function composition over registered policies.
 *
 * Policy registration is compile-time — no dynamic runtime registration.
 * To add support for a new command kind, add a new policy to POLICIES.
 */
import {
  type PostingResult,
  postingRejected,
  postingError,
} from './posting-result.model';
import {
  FinancialTransactionPostingPolicy,
  InvoicePostingPolicy,
  PaymentPostingPolicy,
  RevenueDistributionPostingPolicy,
  SettlementPostingPolicy,
  type IPostingPolicy,
} from './posting-policy';
import type {
  CreateFinancialTransactionCommand,
  CreateInvoiceCommand,
  CreatePaymentCommand,
  CreateRevenueDistributionCommand,
  CreateSettlementCommand,
  FinanceCommandBatch,
} from '../intake/commands/finance.commands';

// ── FinanceCommand union ──────────────────────────────────────────────────────

export type FinanceCommand =
  | CreateFinancialTransactionCommand
  | CreatePaymentCommand
  | CreateInvoiceCommand
  | CreateSettlementCommand
  | CreateRevenueDistributionCommand;

// ── BatchPostingResult ────────────────────────────────────────────────────────

export interface BatchPostingResult {
  readonly transaction:          PostingResult;
  readonly payment:              PostingResult | null;
  readonly invoice:              PostingResult | null;
  readonly settlement:           PostingResult;
  readonly revenueDistribution:  PostingResult | null;
  readonly allSucceeded:         boolean;
}

// ── PostingRuleEngine ─────────────────────────────────────────────────────────

export class PostingRuleEngine {

  private static readonly POLICIES: Array<IPostingPolicy<FinanceCommand>> = [
    new FinancialTransactionPostingPolicy() as IPostingPolicy<FinanceCommand>,
    new PaymentPostingPolicy()              as IPostingPolicy<FinanceCommand>,
    new InvoicePostingPolicy()              as IPostingPolicy<FinanceCommand>,
    new SettlementPostingPolicy()           as IPostingPolicy<FinanceCommand>,
    new RevenueDistributionPostingPolicy()  as IPostingPolicy<FinanceCommand>,
  ];

  /**
   * Resolves a PostingResult for a single Finance command.
   *
   * Pipeline:
   *   1. Find the policy that handles this command kind
   *   2. Apply the policy (validate + produce instructions)
   *   3. Return typed PostingResult
   *
   * Never throws. Returns PostingRejected when no policy is found.
   */
  static resolve(command: unknown): PostingResult {
    if (!command || typeof command !== 'object') {
      return postingRejected('UNSUPPORTED_COMMAND', [
        postingError('command', 'Command must be a non-null object'),
      ]);
    }

    const policy = PostingRuleEngine.POLICIES.find((p) => p.canHandle(command));
    if (!policy) {
      const kind = (command as Record<string, unknown>)['kind'] ?? 'unknown';
      return postingRejected('UNSUPPORTED_COMMAND', [
        postingError('kind', `No posting policy found for command kind "${kind}"`),
      ]);
    }

    try {
      return policy.apply(command as FinanceCommand);
    } catch (err) {
      return postingRejected('INTERNAL_ERROR', [
        postingError('policy', `Policy threw unexpectedly: ${(err as Error).message ?? 'unknown'}`),
      ]);
    }
  }

  /**
   * Resolves posting plans for all commands in a FinanceCommandBatch.
   * Each command is processed independently.
   * allSucceeded = true only when every non-null command succeeded.
   */
  static resolveBatch(batch: FinanceCommandBatch): BatchPostingResult {
    const transaction         = PostingRuleEngine.resolve(batch.transaction);
    const payment             = batch.payment   ? PostingRuleEngine.resolve(batch.payment)   : null;
    const invoice             = batch.invoice   ? PostingRuleEngine.resolve(batch.invoice)   : null;
    const settlement          = PostingRuleEngine.resolve(batch.settlement);
    const revenueDistribution = batch.revenueDistribution
      ? PostingRuleEngine.resolve(batch.revenueDistribution)
      : null;

    const all = [transaction, payment, invoice, settlement, revenueDistribution]
      .filter((r): r is PostingResult => r !== null);

    const allSucceeded = all.every((r) => r.success);

    return Object.freeze({
      transaction,
      payment,
      invoice,
      settlement,
      revenueDistribution,
      allSucceeded,
    });
  }
}

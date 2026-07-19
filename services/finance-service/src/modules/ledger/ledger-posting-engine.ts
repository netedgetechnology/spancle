/**
 * ledger-posting-engine.ts
 *
 * LedgerPostingEngine — the execution layer.
 *
 * Accepts only ResolvedPostingPlans.
 * Makes no accounting decisions.
 * No account mapping.
 * No posting rules.
 *
 * Pipeline:
 *   1. LedgerBalanceValidator  — structural + period validation
 *   2. LedgerEntryBuilder      — produce PENDING LedgerEntry aggregates
 *   3. FinancialTransaction     — build and commit the aggregate
 *   4. Post all entries         — transition each PENDING → POSTED
 *   5. LedgerPersistenceUnit   — atomic write (transaction + all entries)
 *   6. Return LedgerPostingResult
 *
 * Dependencies injected by NestJS:
 *   LedgerPersistenceUnit (requires DB — mocked in unit tests)
 */
import { Injectable, Logger } from '@nestjs/common';
import { LedgerBalanceValidator }  from './ledger-balance-validator';
import { LedgerEntryBuilder }      from './ledger-entry-builder';
import { LedgerPersistenceUnit }   from './ledger-persistence-unit';
import { FinancialTransaction }    from '../foundation/aggregates/financial-transaction.aggregate';
import type {
  LedgerPostingResult,
} from './ledger-posting-result';
import { postingFailed, ledgerError } from './ledger-posting-result';
import type { ResolvedPostingPlan }   from '../accounting/resolved-posting-plan.model';

// ── PostingEngineContext ──────────────────────────────────────────────────────

export interface PostingEngineContext {
  /** UUID for the FinancialTransaction to be created. Caller-supplied. */
  readonly transactionId:   string;
  /** Human-readable reference, e.g. FT-202607-00001. */
  readonly reference:       string;
  /** True when the accounting period is OPEN. Caller determines. */
  readonly periodIsOpen:    boolean;
  /** Effective posting date. Defaults to now when not supplied. */
  readonly postedAt?:       Date;
}

// ── LedgerPostingEngine ───────────────────────────────────────────────────────

@Injectable()
export class LedgerPostingEngine {
  private readonly logger = new Logger(LedgerPostingEngine.name);

  constructor(private readonly persistence: LedgerPersistenceUnit) {}

  /**
   * Executes a resolved posting plan.
   *
   * Pipeline: validate → build → commit → persist → return result.
   * Never throws. All errors are typed LedgerPostingResult.
   *
   * @param plan     ResolvedPostingPlan from the Accounting Resolution Layer.
   * @param context  Execution context (IDs, period state, timestamp).
   */
  async post(
    plan:    Readonly<ResolvedPostingPlan>,
    context: PostingEngineContext,
  ): Promise<LedgerPostingResult> {
    const { transactionId, reference, periodIsOpen } = context;
    const postedAt = context.postedAt ?? new Date();

    this.logger.log(
      `post: tenantId=${plan.tenantId} plan=${plan.planId} ` +
      `period=${plan.accountingPeriod} txId=${transactionId}`,
    );

    // Step 1: Validate
    const validation = LedgerBalanceValidator.validate(plan, periodIsOpen);
    if (!validation.valid) {
      return postingFailed(
        validation.reason ?? 'VALIDATION_FAILED',
        validation.errors as { field: string; message: string }[],
      );
    }

    // Step 2: Build LedgerEntry aggregates (PENDING)
    const prefix  = LedgerEntryBuilder.entryIdPrefix(plan.planId);
    const entries = LedgerEntryBuilder.build(plan, transactionId, prefix, postedAt);

    // Step 3: Build FinancialTransaction aggregate
    let transaction = FinancialTransaction.create(
      {
        id:               transactionId,
        tenantId:         plan.tenantId,
        reference,
        transactionType:  'COMMERCIAL_DECISION',
        accountingPeriod: plan.accountingPeriod,
        sourceType:       'platform_contract',
        sourceId:         plan.sourceReference,
        description:      plan.description,
      },
      entries,
    );

    // Step 4: Commit the transaction (DRAFT → COMMITTED, entries PENDING → POSTED)
    try {
      transaction = transaction.commit(postedAt);
    } catch (err) {
      return postingFailed('IMBALANCE_DETECTED', [
        ledgerError('transaction', `Commit failed: ${(err as Error).message}`),
      ]);
    }

    const postedEntries = Array.from(transaction.entries);

    // Step 5: Persist atomically
    return this.persistence.persist(transaction, postedEntries);
  }
}

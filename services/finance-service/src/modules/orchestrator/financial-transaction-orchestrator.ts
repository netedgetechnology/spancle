/**
 * financial-transaction-orchestrator.ts
 *
 * Financial Transaction Orchestrator — application-layer workflow coordinator.
 *
 * Coordinates:
 *   1. PostingRuleEngine.resolve()       — command → PostingPlan
 *   2. ChartOfAccountsResolver.resolve() — PostingPlan → ResolvedPostingPlan
 *   3. LedgerPostingEngine.post()        — ResolvedPostingPlan → atomic persistence
 *   4. IFinanceDomainEventPublisher      — publish domain events after success
 *
 * Rules:
 *   - Contains ZERO accounting logic.
 *   - Contains ZERO account resolution logic.
 *   - Contains ZERO ledger entry building logic.
 *   - Stops immediately (short-circuit) on any stage failure.
 *   - Publishes events ONLY after successful posting.
 *   - Never depends on Commercial, Booking, or Transport services.
 *
 * Period resolution:
 *   The orchestrator receives periodIsOpen from the context.
 *   It does not query the database for period status directly —
 *   the caller (application service or NestJS controller) supplies this.
 *   This keeps the orchestrator infrastructure-free and easily testable.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID }                 from 'crypto';

import { PostingRuleEngine }          from '../posting/posting-rule-engine';
import { ChartOfAccountsResolver }    from '../accounting/chart-of-accounts-resolver';
import { LedgerPostingEngine }        from '../ledger/ledger-posting-engine';
import {
  FINANCE_DOMAIN_EVENT_PUBLISHER,
  OrchestratorEvents,
  type FinancialTransactionPosted,
  type LedgerPostingCompleted,
  type LedgerPostingFailed,
  type PostingRejected,
  type IFinanceDomainEventPublisher,
  type OrchestratorDomainEvent,
} from './finance-domain-events';
import {
  type OrchestratorResult,
  transactionCompleted,
  transactionRejected,
  orchError,
} from './orchestrator-result';
import { buildResolutionContext }     from '../accounting/resolved-posting-plan.model';
import type { FinanceCommand }        from '../posting/posting-rule-engine';

// ── OrchestratorContext ───────────────────────────────────────────────────────

export interface OrchestratorContext {
  /** UUID for the FinancialTransaction to be created. Caller-supplied (idempotency). */
  readonly transactionId:   string;
  /** Human-readable reference (e.g. FT-202607-00001). */
  readonly reference:       string;
  /** YYYY-MM accounting period the command targets. */
  readonly accountingPeriod: string;
  /** Whether the target accounting period is OPEN. Caller resolves. */
  readonly periodIsOpen:    boolean;
  /** ISO-4217 base currency for the resolution context. */
  readonly baseCurrency:    string;
  /** Tenancy. */
  readonly tenantId:        string;
  /** Distributed trace correlation ID. */
  readonly correlationId:   string;
  /** Effective posting date. Defaults to now when absent. */
  readonly postedAt?:       Date;
}

// ── FinancialTransactionOrchestrator ─────────────────────────────────────────

@Injectable()
export class FinancialTransactionOrchestrator {
  private readonly logger = new Logger(FinancialTransactionOrchestrator.name);

  constructor(
    private readonly ledgerEngine: LedgerPostingEngine,
    @Inject(FINANCE_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: IFinanceDomainEventPublisher,
  ) {}

  /**
   * Executes the complete Finance pipeline for a single Finance command.
   *
   * Pipeline (short-circuits on first failure):
   *   1. PostingRuleEngine.resolve(command)           → PostingResult
   *   2. ChartOfAccountsResolver.resolve(plan, ctx)   → AccountingResolutionResult
   *   3. LedgerPostingEngine.post(resolvedPlan, ctx)  → LedgerPostingResult
   *   4. publishEvents(...)                           — success events only
   *
   * @param command  A Finance internal command (from the Intake ACL).
   * @param context  Orchestration context (IDs, period state, tenant).
   */
  async execute(
    command: FinanceCommand,
    context: OrchestratorContext,
  ): Promise<OrchestratorResult> {
    const { tenantId, accountingPeriod, baseCurrency, correlationId } = context;
    const postedAt = context.postedAt ?? new Date();
    const causationId = context.transactionId;

    this.logger.log(
      `execute: tenantId=${tenantId} txId=${context.transactionId} ` +
      `kind=${(command as { kind?: string }).kind} period=${accountingPeriod}`,
    );

    // ── Stage 1: Posting Rule Engine ──────────────────────────────────────────
    const postingResult = PostingRuleEngine.resolve(command);
    if (!postingResult.success) {
      const reason = postingResult.reason === 'VALIDATION_FAILURE'
        ? 'VALIDATION_FAILED'
        : postingResult.reason === 'UNSUPPORTED_COMMAND'
          ? 'VALIDATION_FAILED'
          : 'VALIDATION_FAILED';

      await this.safePublish([
        this.buildPostingRejectedEvent(
          command, tenantId, postingResult.reason, correlationId, causationId,
        ),
      ]);

      return transactionRejected(
        reason,
        postingResult.errors.map((e) => orchError(e.field, e.message)),
      );
    }

    // ── Stage 2: Accounting Resolution ───────────────────────────────────────
    const resCtx = buildResolutionContext(tenantId, accountingPeriod, baseCurrency);
    const resolutionResult = ChartOfAccountsResolver.resolve(postingResult.plan, resCtx);
    if (!resolutionResult.resolved) {
      await this.safePublish([
        this.buildPostingFailedEvent(
          tenantId, 'RESOLUTION_FAILED',
          resolutionResult.errors.length, correlationId, causationId,
        ),
      ]);

      return transactionRejected(
        'RESOLUTION_FAILED',
        resolutionResult.errors.map((e) => orchError(e.field, e.message)),
      );
    }

    // ── Stage 3: Ledger Posting Engine ────────────────────────────────────────
    const ledgerResult = await this.ledgerEngine.post(
      resolutionResult.plan,
      {
        transactionId: context.transactionId,
        reference:     context.reference,
        periodIsOpen:  context.periodIsOpen,
        postedAt,
      },
    );

    if (!ledgerResult.success) {
      const ledgerReason = ledgerResult.reason === 'ACCOUNTING_PERIOD_CLOSED'
        ? 'PERIOD_CLOSED'
        : ledgerResult.reason === 'PERSISTENCE_FAILED'
          ? 'POSTING_FAILED'
          : 'POSTING_FAILED';

      await this.safePublish([
        this.buildPostingFailedEvent(
          tenantId, ledgerResult.reason,
          ledgerResult.errors.length, correlationId, causationId,
        ),
      ]);

      return transactionRejected(
        ledgerReason,
        ledgerResult.errors.map((e) => orchError(e.field, e.message)),
      );
    }

    // ── Stage 4: Publish success events ──────────────────────────────────────
    const txPostedEvent   = this.buildTransactionPostedEvent(
      ledgerResult.transactionId, tenantId, resolutionResult.plan,
      ledgerResult.entryIds.length, correlationId, causationId,
    );
    const completedEvent  = this.buildPostingCompletedEvent(
      ledgerResult.transactionId, tenantId,
      ledgerResult.entryIds, ledgerResult.postedAt,
      correlationId, causationId,
    );

    const events: OrchestratorDomainEvent[] = [txPostedEvent, completedEvent];
    await this.safePublish(events);

    this.logger.log(
      `execute: SUCCESS txId=${ledgerResult.transactionId} ` +
      `entries=${ledgerResult.entryIds.length}`,
    );

    return transactionCompleted(
      ledgerResult.transactionId,
      [...ledgerResult.entryIds],
      ledgerResult.postedAt,
      events.map((e) => e.eventId),
    );
  }

  // ── Private event builders ────────────────────────────────────────────────

  private buildTransactionPostedEvent(
    transactionId:   string,
    tenantId:        string,
    plan:            { accountingPeriod: string; currency: string; totalDebitMinor: number; sourceReference: string },
    entryCount:      number,
    correlationId:   string,
    causationId:     string,
  ): FinancialTransactionPosted {
    return Object.freeze({
      eventId:          randomUUID(),
      eventType:        OrchestratorEvents.TRANSACTION_POSTED,
      aggregateId:      transactionId,
      aggregateVersion: 1,
      occurredAt:       new Date().toISOString(),
      correlationId,
      causationId,
      transactionId,
      tenantId,
      accountingPeriod: plan.accountingPeriod,
      currency:         plan.currency,
      totalDebitMinor:  plan.totalDebitMinor,
      entryCount,
      sourceReference:  plan.sourceReference,
    });
  }

  private buildPostingCompletedEvent(
    transactionId: string,
    tenantId:      string,
    entryIds:      ReadonlyArray<string>,
    postedAt:      string,
    correlationId: string,
    causationId:   string,
  ): LedgerPostingCompleted {
    return Object.freeze({
      eventId:          randomUUID(),
      eventType:        OrchestratorEvents.POSTING_COMPLETED,
      aggregateId:      transactionId,
      aggregateVersion: 2,
      occurredAt:       new Date().toISOString(),
      correlationId,
      causationId,
      transactionId,
      tenantId,
      entryIds:         Object.freeze([...entryIds]),
      postedAt,
    });
  }

  private buildPostingFailedEvent(
    tenantId:      string,
    reason:        string,
    errorCount:    number,
    correlationId: string,
    causationId:   string,
  ): LedgerPostingFailed {
    return Object.freeze({
      eventId:          randomUUID(),
      eventType:        OrchestratorEvents.POSTING_FAILED,
      aggregateId:      causationId,
      aggregateVersion: 1,
      occurredAt:       new Date().toISOString(),
      correlationId,
      causationId,
      tenantId,
      reason,
      errorCount,
    });
  }

  private buildPostingRejectedEvent(
    command:       FinanceCommand,
    tenantId:      string,
    reason:        string,
    correlationId: string,
    causationId:   string,
  ): PostingRejected {
    return Object.freeze({
      eventId:          randomUUID(),
      eventType:        OrchestratorEvents.POSTING_REJECTED,
      aggregateId:      causationId,
      aggregateVersion: 1,
      occurredAt:       new Date().toISOString(),
      correlationId,
      causationId,
      tenantId,
      reason,
      commandKind:      (command as { kind: string }).kind,
    });
  }

  /** Publishes events without blocking the result. Logs on failure. */
  private async safePublish(events: OrchestratorDomainEvent[]): Promise<void> {
    try {
      await this.eventPublisher.publishMany(events);
    } catch (err) {
      this.logger.error(`safePublish: event publication failed — ${(err as Error).message}`);
    }
  }
}

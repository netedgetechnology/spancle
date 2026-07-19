/**
 * ledger-persistence-unit.ts
 *
 * LedgerPersistenceUnit — persists a FinancialTransaction and all its
 * LedgerEntries atomically using a single TypeORM DataSource transaction.
 *
 * No business logic. No account resolution. No posting decisions.
 * Pure persistence: write transaction header, then write all entry rows.
 *
 * Atomicity rule:
 *   Either BOTH the FinancialTransactionEntity AND all LedgerEntryEntity rows
 *   are committed, or NONE are (transaction rolls back on any failure).
 *
 * Repository convention follows existing finance-service pattern:
 *   @InjectDataSource() DataSource, dataSource.getRepository(Entity)
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }   from '@nestjs/typeorm';
import { DataSource }          from 'typeorm';
import { LedgerEntry }         from '../foundation/aggregates/ledger-entry.aggregate';
import { FinancialTransaction } from '../foundation/aggregates/financial-transaction.aggregate';
import { LedgerEntryEntity }   from '../foundation/entities/ledger-entry.entity';
import {
  FinancialTransactionEntity,
} from '../foundation/entities/financial-transaction.entity';
import type {
  LedgerPostingResult,
  LedgerPostingValidationError,
} from './ledger-posting-result';
import { postingFailed, postingSucceeded, ledgerError } from './ledger-posting-result';

@Injectable()
export class LedgerPersistenceUnit {
  private readonly logger = new Logger(LedgerPersistenceUnit.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Atomically persists a FinancialTransaction and all its LedgerEntries.
   *
   * The transaction aggregate should already be in COMMITTED status —
   * the engine commits it before calling this method. All entries should
   * be in POSTED status.
   *
   * @param transaction  Committed FinancialTransaction aggregate.
   * @param entries      POSTED LedgerEntry aggregates (one per instruction).
   */
  async persist(
    transaction: FinancialTransaction,
    entries:     LedgerEntry[],
  ): Promise<LedgerPostingResult> {
    if (entries.length === 0) {
      return postingFailed('VALIDATION_FAILED', [
        ledgerError('entries', 'Cannot persist a transaction with no ledger entries'),
      ]);
    }

    this.logger.log(
      `persist: tenantId=${transaction.tenantId} txId=${transaction.id} ` +
      `entries=${entries.length}`,
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        const txRepo    = manager.getRepository(FinancialTransactionEntity);
        const entryRepo = manager.getRepository(LedgerEntryEntity);

        // 1. Persist transaction header
        const txEntity = txRepo.create({
          id:               transaction.id,
          tenantId:         transaction.tenantId,
          reference:        transaction.reference,
          transactionType:  transaction.transactionType,
          accountingPeriod: transaction.accountingPeriod,
          sourceType:       transaction.sourceType,
          sourceId:         transaction.sourceId,
          description:      transaction.description,
          status:           transaction.status,
          reversedById:     transaction.reversedById,
          reversalOfId:     transaction.reversalOfId,
          committedAt:      transaction.committedAt,
          createdAt:        transaction.createdAt,
        });
        await txRepo.save(txEntity);

        // 2. Persist all ledger entries (batch insert)
        const entryEntities = entries.map((e) =>
          entryRepo.create({
            id:               e.id,
            tenantId:         e.tenantId,
            transactionId:    e.transactionId,
            accountCode:      e.accountCode,
            accountingPeriod: e.accountingPeriod,
            debitOrCredit:    e.debitOrCredit,
            amountMinor:      e.amountMinor,
            currency:         e.currency,
            description:      e.description,
            postedAt:         e.postedAt,
            status:           e.status,
            reversedById:     e.reversedById,
            reversalOfId:     e.reversalOfId,
            createdAt:        e.createdAt,
          }),
        );
        await entryRepo.save(entryEntities);
      });

      this.logger.log(`persist: committed txId=${transaction.id}`);
      return postingSucceeded(transaction.id, entries);

    } catch (err) {
      const msg = (err as Error).message ?? 'unknown';
      this.logger.error(`persist: rollback txId=${transaction.id} — ${msg}`);
      return postingFailed('PERSISTENCE_FAILED', [
        ledgerError('dataSource', `Atomic persistence failed: ${msg}`),
      ]);
    }
  }
}

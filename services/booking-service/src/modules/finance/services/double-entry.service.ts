import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource }          from '@nestjs/typeorm';
import { DataSource }                from 'typeorm';
import { JournalRepository }         from '../repositories/journal.repository';
import { AccountingPeriodService }   from './accounting-period.service';
import { ChartOfAccountRepository }  from '../repositories/chart-of-account.repository';
import type { JournalEntryInput, JournalLineInput } from '../repositories/journal.repository';
import type { JournalEntryEntity }   from '../entities/journal.entity';

export interface PostJournalDto {
  tenantId:    string;
  entryType:   JournalEntryEntity['entryType'];
  sourceType?: string;
  sourceId?:   string;
  description: string;
  postedAt:    Date;
  currency:    string;
  lines:       JournalLineInput[];
}

/**
 * DoubleEntryService — the only service that writes to journal_entries and journal_lines.
 *
 * Enforces all global Finance rules at the write boundary:
 *   1. All amounts are integers (minor units) — no float, no decimal.
 *   2. Every entry is balanced: ∑ debitMinor = ∑ creditMinor.
 *   3. Entries are immutable after commit.
 *   4. Corrections are only via reversal entries.
 *   5. No posting into closed or locked accounting periods.
 *
 * All writes occur within DataSource.transaction() — atomicity guaranteed.
 */
@Injectable()
export class DoubleEntryService {
  private readonly logger = new Logger(DoubleEntryService.name);

  constructor(
    private readonly journalRepository:   JournalRepository,
    private readonly periodService:        AccountingPeriodService,
    private readonly accountRepository:   ChartOfAccountRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Validation ────────────────────────────────────────────────────────────

  /**
   * Asserts the entry is balanced and all amounts are valid integers.
   * Called before every post() — never bypass this check.
   *
   * @throws BadRequestException on any violation.
   */
  assertBalanced(lines: JournalLineInput[]): void {
    if (lines.length < 2) {
      throw new BadRequestException(
        'A journal entry must have at least two lines (double-entry requirement)',
      );
    }

    let totalDebit  = 0;
    let totalCredit = 0;

    for (const line of lines) {
      // Integer enforcement — no floats allowed anywhere in Finance
      if (!Number.isInteger(line.debitMinor) || !Number.isInteger(line.creditMinor)) {
        throw new BadRequestException(
          'Journal line amounts must be integers (minor currency units — no decimals)',
        );
      }
      if (line.debitMinor < 0 || line.creditMinor < 0) {
        throw new BadRequestException(
          'Journal line amounts must be non-negative. Use the correct debit/credit column.',
        );
      }
      // Exactly one side must be non-zero
      if ((line.debitMinor === 0) === (line.creditMinor === 0)) {
        throw new BadRequestException(
          `Journal line for account ${line.accountCode}: exactly one of debitMinor / creditMinor must be > 0`,
        );
      }

      totalDebit  += line.debitMinor;
      totalCredit += line.creditMinor;
    }

    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Journal entry is not balanced: debits=${totalDebit} credits=${totalCredit} ` +
        `(difference=${Math.abs(totalDebit - totalCredit)})`,
      );
    }
  }

  // ── Post ─────────────────────────────────────────────────────────────────

  /**
   * Validates and posts a balanced journal entry.
   *
   * Flow:
   *   1. assertBalanced() — validates integer amounts and balance
   *   2. AccountingPeriodService.assertOpen() — rejects closed periods
   *   3. DataSource.transaction() — atomic insert of entry + lines
   *   4. Returns the committed JournalEntryEntity
   */
  async post(dto: PostJournalDto): Promise<JournalEntryEntity> {
    this.assertBalanced(dto.lines);

    // Validate accounting period — throws PeriodClosedException if closed/locked
    const period = await this.periodService.assertOpen(dto.tenantId, dto.postedAt);

    // Assign currency to all lines
    const lines: JournalLineInput[] = dto.lines.map((l) => ({
      ...l,
      currency: l.currency || dto.currency,
    }));

    return this.dataSource.transaction(async (manager) => {
      const reference = await this.journalRepository.nextReference(
        period.period,
        dto.tenantId,
      );

      const input: JournalEntryInput = {
        tenantId:         dto.tenantId,
        reference,
        entryType:        dto.entryType,
        sourceType:       dto.sourceType,
        sourceId:         dto.sourceId,
        description:      dto.description,
        postedAt:         dto.postedAt,
        accountingPeriod: period.period,
        lines,
      };

      const entry = await this.journalRepository.insertEntry(input, manager);

      this.logger.log(
        `Journal posted: ${reference} type=${dto.entryType} ` +
        `source=${dto.sourceType ?? 'manual'}:${dto.sourceId ?? '-'} ` +
        `period=${period.period} tenant=${dto.tenantId}`,
      );

      return entry;
    });
  }

  // ── Reverse ───────────────────────────────────────────────────────────────

  /**
   * Creates a reversing journal entry for an existing entry.
   *
   * The reversing entry has:
   *   - Each original debit line → credit line for the same amount
   *   - Each original credit line → debit line for the same amount
   *   - entryType = 'reversal'
   *   - reversalOf = originalId
   *
   * The original entry's reversedBy is then set to the new entry's ID.
   *
   * Reversal can post into the current open period (does not need to match
   * the original entry's period) — this is correct accounting practice.
   *
   * @param originalId  ID of the JournalEntryEntity to reverse
   * @param tenantId    Must match the original entry's tenantId
   * @param description Human-readable reason for the reversal
   * @param postedAt    Effective date of the reversal (defaults to now)
   * @param actorId     For logging only
   */
  async reverse(
    originalId:  string,
    tenantId:    string,
    description: string,
    actorId:     string,
    postedAt?:   Date,
  ): Promise<JournalEntryEntity> {
    const original = await this.journalRepository.findById(originalId, tenantId);
    if (!original) {
      throw new BadRequestException(`Journal entry ${originalId} not found`);
    }
    if (original.reversedBy) {
      throw new BadRequestException(
        `Journal entry ${originalId} has already been reversed by ${original.reversedBy}`,
      );
    }

    const originalLines = await this.journalRepository.findLinesForEntry(
      originalId,
      tenantId,
    );
    if (originalLines.length === 0) {
      throw new BadRequestException(`Journal entry ${originalId} has no lines to reverse`);
    }

    const reversalDate  = postedAt ?? new Date();
    const period        = await this.periodService.assertOpen(tenantId, reversalDate);

    // Mirror debits ↔ credits
    const mirroredLines: JournalLineInput[] = originalLines.map((l) => ({
      accountCode:  l.accountCode,
      debitMinor:   l.creditMinor,   // swap
      creditMinor:  l.debitMinor,    // swap
      currency:     l.currency,
      description:  `Reversal: ${l.description ?? ''}`.trim(),
    }));

    this.assertBalanced(mirroredLines);

    return this.dataSource.transaction(async (manager) => {
      const reference = await this.journalRepository.nextReference(
        period.period,
        tenantId,
      );

      const reversalInput: JournalEntryInput = {
        tenantId,
        reference,
        entryType:        'reversal',
        sourceType:       original.sourceType   ?? undefined,
        sourceId:         original.sourceId     ?? undefined,
        description,
        postedAt:         reversalDate,
        accountingPeriod: period.period,
        reversalOf:       originalId,
        lines:            mirroredLines,
      };

      const reversingEntry = await this.journalRepository.insertEntry(
        reversalInput,
        manager,
      );

      // Link: mark the original as reversed
      await this.journalRepository.markReversed(originalId, reversingEntry.id, manager);

      this.logger.log(
        `Journal reversed: ${reference} reverses ${original.reference} ` +
        `actor=${actorId} tenant=${tenantId}`,
      );

      return reversingEntry;
    });
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findBySource(
    sourceId: string,
    tenantId: string,
  ): Promise<JournalEntryEntity[]> {
    return this.journalRepository.findBySource(sourceId, tenantId);
  }

  async findByPeriod(
    period:   string,
    tenantId: string,
    limit?:   number,
    offset?:  number,
  ): Promise<JournalEntryEntity[]> {
    return this.journalRepository.findByPeriod(period, tenantId, limit, offset);
  }
}

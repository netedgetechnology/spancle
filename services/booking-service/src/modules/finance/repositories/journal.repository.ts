import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }  from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { JournalEntryEntity } from '../entities/journal.entity';
import { JournalLineEntity }  from '../entities/journal.entity';

export interface JournalLineInput {
  accountCode:  string;
  debitMinor:   number;
  creditMinor:  number;
  currency:     string;
  description?: string;
}

export interface JournalEntryInput {
  tenantId:         string;
  reference:        string;
  entryType:        JournalEntryEntity['entryType'];
  sourceType?:      string;
  sourceId?:        string;
  description:      string;
  postedAt:         Date;
  accountingPeriod: string;
  reversalOf?:      string;
  lines:            JournalLineInput[];
}

@Injectable()
export class JournalRepository {
  private readonly logger = new Logger(JournalRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get entryRepo() {
    return this.dataSource.getRepository(JournalEntryEntity);
  }
  private get lineRepo() {
    return this.dataSource.getRepository(JournalLineEntity);
  }

  /**
   * Inserts a balanced journal entry + lines inside an existing manager transaction.
   * Caller is responsible for ensuring the entry is balanced before calling.
   * All journal_entry + journal_line rows are INSERT-only: never updated after creation.
   */
  async insertEntry(
    input:   JournalEntryInput,
    manager: EntityManager,
  ): Promise<JournalEntryEntity> {
    const entryRepo = manager.getRepository(JournalEntryEntity);
    const lineRepo  = manager.getRepository(JournalLineEntity);

    const entry = await entryRepo.save(
      entryRepo.create({
        tenantId:         input.tenantId,
        reference:        input.reference,
        entryType:        input.entryType,
        sourceType:       input.sourceType       ?? null,
        sourceId:         input.sourceId         ?? null,
        description:      input.description,
        postedAt:         input.postedAt,
        accountingPeriod: input.accountingPeriod,
        reversalOf:       input.reversalOf       ?? null,
        reversedBy:       null,
      }),
    );

    await lineRepo.save(
      input.lines.map((l) =>
        lineRepo.create({
          tenantId:      input.tenantId,
          journalEntryId: entry.id,
          accountCode:   l.accountCode,
          debitMinor:    l.debitMinor,
          creditMinor:   l.creditMinor,
          currency:      l.currency,
          postedAt:      input.postedAt,
          description:   l.description ?? null,
        }),
      ),
    );

    return entry;
  }

  /**
   * Marks an entry as reversed by recording its reversal's ID.
   * Called after the reversing entry is committed.
   * Uses UPDATE on the entry row (the only allowed mutation — linking reversal).
   */
  async markReversed(
    originalId:  string,
    reversingId: string,
    manager:     EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(JournalEntryEntity)
      .update({ id: originalId }, { reversedBy: reversingId });
  }

  async findById(id: string, tenantId: string): Promise<JournalEntryEntity | null> {
    return this.entryRepo.findOne({ where: { id, tenantId } });
  }

  async findBySource(
    sourceId:  string,
    tenantId:  string,
  ): Promise<JournalEntryEntity[]> {
    return this.entryRepo.find({
      where:  { sourceId, tenantId },
      order:  { postedAt: 'ASC' },
    });
  }

  async findLinesForEntry(
    journalEntryId: string,
    tenantId:       string,
  ): Promise<JournalLineEntity[]> {
    return this.lineRepo.find({
      where: { journalEntryId, tenantId },
      order: { id: 'ASC' },
    });
  }

  async findByPeriod(
    period:   string,
    tenantId: string,
    limit = 100,
    offset = 0,
  ): Promise<JournalEntryEntity[]> {
    return this.entryRepo.find({
      where:  { accountingPeriod: period, tenantId },
      order:  { postedAt: 'ASC' },
      take:   limit,
      skip:   offset,
    });
  }

  /**
   * Generates the next sequential journal reference for the period.
   * Pattern: JNL-YYYYMM-NNNNN (zero-padded to 5 digits).
   */
  async nextReference(period: string, tenantId: string): Promise<string> {
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::int as count
       FROM finance_journal_entries
       WHERE tenant_id = $1 AND accounting_period = $2`,
      [tenantId, period],
    );
    const seq = (Number(result[0]?.count ?? 0) + 1).toString().padStart(5, '0');
    return `JNL-${period.replace('-', '')}-${seq}`;
  }
}

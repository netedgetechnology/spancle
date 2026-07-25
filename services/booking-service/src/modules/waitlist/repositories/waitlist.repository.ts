import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { InjectDataSource }  from '@nestjs/typeorm';
import type { Repository }   from 'typeorm';
import { DataSource }        from 'typeorm';
import { WaitlistEntryEntity } from '../entities/waitlist-entry.entity';

@Injectable()
export class WaitlistRepository {
  private readonly logger = new Logger(WaitlistRepository.name);

  constructor(
    @InjectRepository(WaitlistEntryEntity)
    private readonly repo: Repository<WaitlistEntryEntity>,
    @InjectDataSource()
    private readonly ds: DataSource,
  ) {}

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(data: Partial<WaitlistEntryEntity>): Promise<WaitlistEntryEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, tenantId: string, data: Partial<WaitlistEntryEntity>): Promise<WaitlistEntryEntity> {
    await this.repo.update({ id, tenantId }, data as object);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, {
      status:    'cancelled',
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<WaitlistEntryEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findBySlot(slotId: string, tenantId: string): Promise<WaitlistEntryEntity[]> {
    return this.repo.find({
      where:  { slotId, tenantId, isDeleted: false },
      order:  { position: 'ASC' },
    });
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<WaitlistEntryEntity[]> {
    return this.repo.find({
      where:  { customerId, tenantId, isDeleted: false },
      order:  { createdAt: 'DESC' },
    });
  }

  /**
   * findDuplicate()
   *
   * Returns an existing 'waiting' entry for the same slot + customer.
   * Used for duplicate prevention before inserting a new entry.
   */
  async findDuplicate(params: {
    slotId:     string;
    tenantId:   string;
    userId?:    string | null;
    customerId?: string | null;
  }): Promise<WaitlistEntryEntity | null> {
    const qb = this.repo.createQueryBuilder('w')
      .where('w.slot_id = :slotId',    { slotId:   params.slotId })
      .andWhere('w.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere("w.status = 'waiting'")
      .andWhere('w.is_deleted = FALSE');

    if (params.userId) {
      qb.andWhere('w.user_id = :userId', { userId: params.userId });
    } else if (params.customerId) {
      qb.andWhere('w.customer_id = :customerId', { customerId: params.customerId });
    }

    return qb.getOne();
  }

  /**
   * nextPosition()
   *
   * Returns MAX(position) + 1 for a given slot, or 1 if no entries exist yet.
   * Must be called inside a transaction to be race-safe (handled by WaitlistService).
   */
  async nextPosition(slotId: string, tenantId: string): Promise<number> {
    const [{ max }] = await this.ds.query<[{ max: number | null }]>(
      `SELECT MAX(position) AS max FROM waitlist_entries
       WHERE slot_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      [slotId, tenantId],
    );
    return (max ?? 0) + 1;
  }

  /**
   * firstWaiting()
   *
   * Returns the highest-priority (lowest position) 'waiting' entry for a slot.
   * Used by the promotion sweep.
   */
  async firstWaiting(slotId: string, tenantId: string): Promise<WaitlistEntryEntity | null> {
    return this.repo.findOne({
      where: { slotId, tenantId, status: 'waiting', isDeleted: false },
      order: { position: 'ASC' },
    });
  }

  /**
   * findExpiredPromotions()
   *
   * Returns promoted entries whose promotedUntil < now.
   * Called by the scheduler to expire stale promotions and re-promote.
   */
  async findExpiredPromotions(batchSize = 50): Promise<WaitlistEntryEntity[]> {
    return this.ds.query<WaitlistEntryEntity[]>(
      `SELECT * FROM waitlist_entries
       WHERE status = 'promoted' AND promoted_until < NOW()
         AND is_deleted = FALSE
       ORDER BY promoted_until ASC
       LIMIT $1`,
      [batchSize],
    );
  }
}

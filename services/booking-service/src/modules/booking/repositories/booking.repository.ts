import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import { BookingEntity, type BookingStatus } from '../entities/booking.entity';

export interface BookingQueryParams {
  tenantId:   string;
  branchId?:  string;
  courtId?:   string;
  sportId?:   string;
  userId?:    string;
  status?:    BookingStatus;
  from?:      Date;
  to?:        Date;
  reference?: string;
  limit?:     number;
  offset?:    number;
}

@Injectable()
export class BookingRepository {
  private readonly logger = new Logger(BookingRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() { return this.dataSource.getRepository(BookingEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<BookingEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<BookingEntity | null> {
    return this.scopedQb('b', tenantId).andWhere('b.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<BookingEntity> {
    const b = await this.findById(id, tenantId);
    if (!b) throw new NotFoundException(`Booking ${id} not found`);
    return b;
  }

  async findByReference(reference: string, tenantId: string): Promise<BookingEntity | null> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.reference = :reference', { reference })
      .getOne();
  }

  async query(params: BookingQueryParams): Promise<BookingEntity[]> {
    const qb = this.scopedQb('b', params.tenantId)
      .orderBy('b.startsAt', 'DESC');

    if (params.branchId)  qb.andWhere('b.branchId = :branchId',   { branchId:  params.branchId  });
    if (params.courtId)   qb.andWhere('b.courtId = :courtId',     { courtId:   params.courtId   });
    if (params.sportId)   qb.andWhere('b.sportId = :sportId',     { sportId:   params.sportId   });
    if (params.userId)    qb.andWhere('b.userId = :userId',       { userId:    params.userId    });
    if (params.status)    qb.andWhere('b.status = :status',       { status:    params.status    });
    if (params.reference) qb.andWhere('b.reference = :reference', { reference: params.reference });
    if (params.from)      qb.andWhere('b.startsAt >= :from',      { from:      params.from      });
    if (params.to)        qb.andWhere('b.startsAt < :to',         { to:        params.to        });

    if (params.limit)  qb.take(params.limit);
    if (params.offset) qb.skip(params.offset);

    return qb.getMany();
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<BookingEntity>,
  ): Promise<BookingEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() } as any);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    );
  }

  async countByStatus(tenantId: string): Promise<Record<BookingStatus, number>> {
    const rows = await this.scopedQb('b', tenantId)
      .select('b.status', 'status')
      .addSelect('COUNT(b.id)::int', 'count')
      .groupBy('b.status')
      .getRawMany<{ status: BookingStatus; count: string }>();

    const counts: Record<BookingStatus, number> = {
      reserved: 0, pending_payment: 0, confirmed: 0,
      checked_in: 0, in_progress: 0, completed: 0,
      cancelled: 0, no_show: 0, refunded: 0,
      rescheduled: 0, expired: 0,
    };
    for (const r of rows) counts[r.status] = Number(r.count);
    return counts;
  }

  async findConfirmedOverlapping(params: {
    tenantId: string;
    courtId:  string;
    startsAt: Date;
    endsAt:   Date;
    excludeId?: string;
  }): Promise<BookingEntity[]> {
    const qb = this.scopedQb('b', params.tenantId)
      .andWhere('b.courtId = :courtId', { courtId: params.courtId })
      .andWhere("b.status IN ('pending_payment','confirmed')")
      .andWhere('b.startsAt < :endsAt',  { endsAt:   params.endsAt  })
      .andWhere('b.endsAt > :startsAt',  { startsAt: params.startsAt });

    if (params.excludeId) qb.andWhere('b.id != :excludeId', { excludeId: params.excludeId });
    return qb.getMany();
  }

  /**
   * Finds all confirmed bookings for a user that start within the given range.
   * Used by recurring booking generation to detect duplicates.
   */
  async findByUserInRange(params: {
    tenantId: string;
    userId:   string;
    courtId:  string;
    from:     Date;
    to:       Date;
  }): Promise<BookingEntity[]> {
    return this.scopedQb('b', params.tenantId)
      .andWhere('b.userId = :userId',    { userId:   params.userId   })
      .andWhere('b.courtId = :courtId',  { courtId:  params.courtId  })
      .andWhere("b.status IN ('pending_payment','confirmed')")
      .andWhere('b.startsAt >= :from',   { from:     params.from     })
      .andWhere('b.startsAt < :to',      { to:       params.to       })
      .getMany();
  }

  /**
   * Finds bookings in reserved/pending_payment whose expiresAt has passed.
   * Capped at batchSize to prevent a single sweep processing thousands of rows.
   */
  async findExpiredReservations(batchSize = 50): Promise<BookingEntity[]> {
    return this.dataSource.getRepository(BookingEntity)
      .createQueryBuilder('b')
      .where("b.status IN ('reserved','pending_payment')")
      .andWhere('b.expiresAt < :now', { now: new Date() })
      .andWhere('b.isDeleted = false')
      .orderBy('b.expiresAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Finds all confirmed bookings that started before now and are still 'confirmed'.
   * Called by the scheduler to mark completed bookings.
   */
  async findPastConfirmed(tenantId: string, before: Date, batchSize = 50): Promise<BookingEntity[]> {
    return this.scopedQb('b', tenantId)
      .andWhere("b.status = 'confirmed'")
      .andWhere('b.endsAt < :before', { before })
      .take(batchSize)
      .getMany();
  }

  /**
   * Finds confirmed bookings whose start time has arrived but are not yet in_progress.
   * Used by the scheduler to auto-transition confirmed → in_progress.
   */
  async findStartedConfirmed(tenantId: string, batchSize = 50): Promise<BookingEntity[]> {
    return this.scopedQb('b', tenantId)
      .andWhere("b.status = 'confirmed'")
      .andWhere('b.startsAt <= :now', { now: new Date() })
      .andWhere('b.endsAt > :now2', { now2: new Date() })
      .take(batchSize)
      .getMany();
  }

  /**
   * Finds confirmed bookings where the session started but no check-in occurred.
   * Used for no-show detection.
   */
  async findNoShowCandidates(tenantId: string, gracePeriodMinutes = 30, batchSize = 50): Promise<BookingEntity[]> {
    const cutoff = new Date(Date.now() - gracePeriodMinutes * 60_000);
    return this.scopedQb('b', tenantId)
      .andWhere("b.status = 'confirmed'")
      .andWhere('b.startsAt < :cutoff', { cutoff })
      .andWhere('b.checkedInAt IS NULL')
      .take(batchSize)
      .getMany();
  }
}

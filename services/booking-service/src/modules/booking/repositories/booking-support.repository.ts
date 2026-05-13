import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BookingPaymentEntity, type PaymentStatus } from '../entities/booking-payment.entity';
import { BookingRefundEntity } from '../entities/booking-refund.entity';
import { BookingLogEntity, type BookingLogAction } from '../entities/booking-log.entity';

// ── Payment repository ─────────────────────────────────────────────────────

@Injectable()
export class BookingPaymentRepository {
  private readonly logger = new Logger(BookingPaymentRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() { return this.dataSource.getRepository(BookingPaymentEntity); }

  async create(data: Partial<BookingPaymentEntity>): Promise<BookingPaymentEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<BookingPaymentEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<BookingPaymentEntity> {
    const p = await this.findById(id, tenantId);
    if (!p) throw new Error(`BookingPayment ${id} not found`);
    return p;
  }

  async findByBooking(bookingId: string, tenantId: string): Promise<BookingPaymentEntity[]> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.bookingId = :bookingId', { bookingId })
      .andWhere('p.isDeleted = false')
      .orderBy('p.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Returns the most recent paid payment for a booking.
   * Used by refund service to validate refund amount.
   */
  async findPaidPayment(bookingId: string, tenantId: string): Promise<BookingPaymentEntity | null> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.bookingId = :bookingId', { bookingId })
      .andWhere("p.status = 'paid'")
      .andWhere('p.isDeleted = false')
      .orderBy('p.createdAt', 'DESC')
      .getOne();
  }

  async findByIdempotencyKey(
    key:      string,
    tenantId: string,
  ): Promise<BookingPaymentEntity | null> {
    return this.repo.findOne({
      where: { idempotencyKey: key, tenantId, isDeleted: false },
    });
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<BookingPaymentEntity>,
  ): Promise<BookingPaymentEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() } as any);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async sumPaidForBooking(bookingId: string, tenantId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountMinor), 0)::int', 'total')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.bookingId = :bookingId', { bookingId })
      .andWhere("p.status = 'paid'")
      .andWhere('p.isDeleted = false')
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }
}

// ── Refund repository ──────────────────────────────────────────────────────

@Injectable()
export class BookingRefundRepository {
  private readonly logger = new Logger(BookingRefundRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() { return this.dataSource.getRepository(BookingRefundEntity); }

  async create(data: Partial<BookingRefundEntity>): Promise<BookingRefundEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<BookingRefundEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<BookingRefundEntity> {
    const r = await this.findById(id, tenantId);
    if (!r) throw new Error(`BookingRefund ${id} not found`);
    return r;
  }

  async findByBooking(bookingId: string, tenantId: string): Promise<BookingRefundEntity[]> {
    return this.repo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.bookingId = :bookingId', { bookingId })
      .andWhere('r.isDeleted = false')
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<BookingRefundEntity[]> {
    return this.repo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.paymentId = :paymentId', { paymentId })
      .andWhere('r.isDeleted = false')
      .getMany();
  }

  async sumProcessedForPayment(paymentId: string, tenantId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amountMinor), 0)::int', 'total')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.paymentId = :paymentId', { paymentId })
      .andWhere("r.status = 'processed'")
      .andWhere('r.isDeleted = false')
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     Partial<BookingRefundEntity>,
  ): Promise<BookingRefundEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() } as any);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }
}

// ── Log repository ─────────────────────────────────────────────────────────

@Injectable()
export class BookingLogRepository {
  private readonly logger = new Logger(BookingLogRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() { return this.dataSource.getRepository(BookingLogEntity); }

  /** INSERT only — no update or delete operations exposed */
  async insert(data: {
    tenantId:       string;
    bookingId:      string;
    action:         BookingLogAction;
    actorId?:       string | null;
    actorType?:     'user' | 'admin' | 'system' | null;
    previousStatus?: string | null;
    newStatus?:     string | null;
    diff?:          Record<string, unknown> | null;
    note?:          string | null;
    ipAddress?:     string | null;
  }): Promise<BookingLogEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByBooking(
    bookingId: string,
    tenantId:  string,
  ): Promise<BookingLogEntity[]> {
    return this.repo
      .createQueryBuilder('l')
      .where('l.tenantId = :tenantId', { tenantId })
      .andWhere('l.bookingId = :bookingId', { bookingId })
      .orderBy('l.createdAt', 'ASC')
      .getMany();
  }

  async findByAction(
    tenantId: string,
    action:   BookingLogAction,
    from?:    Date,
    to?:      Date,
  ): Promise<BookingLogEntity[]> {
    const qb = this.repo
      .createQueryBuilder('l')
      .where('l.tenantId = :tenantId', { tenantId })
      .andWhere('l.action = :action', { action })
      .orderBy('l.createdAt', 'DESC');

    if (from) qb.andWhere('l.createdAt >= :from', { from });
    if (to)   qb.andWhere('l.createdAt < :to', { to });

    return qb.getMany();
  }
}

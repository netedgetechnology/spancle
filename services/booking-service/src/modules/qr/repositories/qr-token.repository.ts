import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }  from '@nestjs/typeorm';
import { DataSource }        from 'typeorm';
import { QrTokenEntity, type QrTokenStatus } from '../entities/qr-token.entity';
import { QrScanLogEntity, type ScanOutcome } from '../entities/qr-scan-log.entity';

@Injectable()
export class QrTokenRepository {
  private readonly logger = new Logger(QrTokenRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo()    { return this.dataSource.getRepository(QrTokenEntity);   }
  private get scanRepo(){ return this.dataSource.getRepository(QrScanLogEntity); }

  // ── Token CRUD ─────────────────────────────────────────────────────────────

  async create(data: Partial<QrTokenEntity>): Promise<QrTokenEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<QrTokenEntity | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<QrTokenEntity> {
    const t = await this.findById(id, tenantId);
    if (!t) throw new Error(`QrToken ${id} not found`);
    return t;
  }

  /**
   * Primary lookup path — O(1) via UNIQUE index on token_hash.
   * Called on every scan; must be fast.
   */
  async findByHash(tokenHash: string): Promise<QrTokenEntity | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  async findByBooking(bookingId: string, tenantId: string): Promise<QrTokenEntity[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.bookingId = :bookingId', { bookingId })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async findActiveForBooking(bookingId: string, tenantId: string): Promise<QrTokenEntity | null> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.bookingId = :bookingId', { bookingId })
      .andWhere("t.status = 'active'")
      .andWhere('t.expiresAt > :now', { now: new Date() })
      .orderBy('t.createdAt', 'DESC')
      .getOne();
  }

  /**
   * Increments useCount and conditionally marks as 'used' when maxUses reached.
   * Atomic: uses a single UPDATE with computed status.
   */
  async recordUsage(
    id:       string,
    tenantId: string,
    deviceId: string | null,
    scanIp:   string | null,
  ): Promise<QrTokenEntity> {
    const now = new Date();

    await this.repo
      .createQueryBuilder()
      .update(QrTokenEntity)
      .set({
        useCount:    () => '"use_count" + 1',
        firstUsedAt: () => 'COALESCE("first_used_at", NOW())',
        lastUsedAt:  now,
        deviceId:    deviceId  ?? undefined,
        scanIp:      scanIp    ?? undefined,
        status:      () =>
          `CASE WHEN "use_count" + 1 >= "max_uses" THEN 'used'::qr_token_status ELSE 'active'::qr_token_status END`,
      })
      .where('id = :id', { id })
      .andWhere('tenantId = :tenantId', { tenantId })
      .execute();

    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async updateStatus(
    id:       string,
    tenantId: string,
    status:   QrTokenStatus,
    extra?:   Partial<Pick<QrTokenEntity, 'revokedAt' | 'revokedById' | 'revokeReason'>>,
  ): Promise<void> {
    await this.repo.update({ id, tenantId }, { status, ...extra });
  }

  /**
   * Bulk-expires all active tokens whose expiresAt has passed.
   * Called by a scheduled job.
   */
  async bulkExpireStale(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(QrTokenEntity)
      .set({ status: 'expired' })
      .where("status = 'active'")
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }

  // ── Scan log (INSERT only) ─────────────────────────────────────────────────

  async logScan(data: {
    tenantId:           string;
    tokenId:            string | null;
    tokenHashPresented: string;
    bookingId:          string | null;
    branchId:           string | null;
    courtId:            string | null;
    outcome:            ScanOutcome;
    denialReason:       string | null;
    deviceId:           string | null;
    deviceFirmware:     string | null;
    scanIp:             string | null;
    verificationMs:     number | null;
  }): Promise<void> {
    await this.scanRepo.save(this.scanRepo.create(data));
  }

  async findScanLogs(
    tenantId:  string,
    bookingId: string,
  ): Promise<QrScanLogEntity[]> {
    return this.scanRepo
      .createQueryBuilder('sl')
      .where('sl.tenantId = :tenantId', { tenantId })
      .andWhere('sl.bookingId = :bookingId', { bookingId })
      .orderBy('sl.createdAt', 'DESC')
      .getMany();
  }

  async findScanLogsByDevice(
    tenantId: string,
    deviceId: string,
    from?:    Date,
    to?:      Date,
  ): Promise<QrScanLogEntity[]> {
    const qb = this.scanRepo
      .createQueryBuilder('sl')
      .where('sl.tenantId = :tenantId', { tenantId })
      .andWhere('sl.deviceId = :deviceId', { deviceId })
      .orderBy('sl.createdAt', 'DESC');

    if (from) qb.andWhere('sl.createdAt >= :from', { from });
    if (to)   qb.andWhere('sl.createdAt < :to',   { to   });

    return qb.getMany();
  }
}

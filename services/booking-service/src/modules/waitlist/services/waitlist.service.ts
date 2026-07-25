import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent }          from '@nestjs/event-emitter';
import { Cron }             from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService }    from '@nestjs/config';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { DataSource }       from 'typeorm';
import { WaitlistRepository }     from '../repositories/waitlist.repository';
import { WaitlistEntryEntity }    from '../entities/waitlist-entry.entity';
import { SlotRepository }         from '../../slot/repositories/slot.repository';
import { SlotEntity }             from '../../slot/entities/slot.entity';
import { BookingEvents }          from '../../booking/events/booking.events';
import { SlotEvents }             from '../../slot/events/slot.events';
import type { JoinWaitlistDto, WaitlistQueryDto } from '../dto/waitlist.dto';

/** Default TTL given to a promoted customer to complete the booking. */
const DEFAULT_RESERVATION_TTL_MINS = 30;

export interface WaitlistListResult {
  data:  WaitlistEntryEntity[];
  total: number;
}

/**
 * Payload of SlotEvents.SLOTS_RELEASED — emitted by BookingService
 * when a booking is cancelled or expires.
 */
interface SlotsReleasedPayload {
  tenantId:  string;
  bookingId: string;
  slotIds:   string[];
  reason:    string;
  actorId:   string;
  timestamp: string;
}

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);
  private readonly reservationTtlMins: number;

  constructor(
    private readonly waitlistRepository: WaitlistRepository,
    private readonly slotRepository:     SlotRepository,
    private readonly eventEmitter:       EventEmitter2,
    private readonly config:             ConfigService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {
    this.reservationTtlMins =
      this.config.get<number>('WAITLIST_RESERVATION_TTL_MINS') ??
      DEFAULT_RESERVATION_TTL_MINS;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * join()
   *
   * Adds a customer to the waitlist for a specific slot.
   * Guards:
   *   1. Slot must exist for this tenant.
   *   2. If slot is currently available → reject (they should just book it).
   *   3. Duplicate check: same customer + same slot in status=waiting → ConflictException.
   *
   * Position is computed atomically inside a transaction.
   */
  async join(
    dto:      JoinWaitlistDto,
    tenantId: string,
    actorId:  string,
  ): Promise<WaitlistEntryEntity> {
    const slot = await this.slotRepository.findById(dto.slotId, tenantId);
    if (!slot) throw new NotFoundException(`Slot ${dto.slotId} not found`);

    if (slot.status === 'available') {
      throw new BadRequestException(
        'Slot is currently available — please book directly instead of joining the waitlist',
      );
    }

    // Duplicate prevention
    const existing = await this.waitlistRepository.findDuplicate({
      slotId:     dto.slotId,
      tenantId,
      userId:     dto.userId     ?? null,
      customerId: dto.customerId ?? null,
    });
    if (existing) {
      throw new ConflictException(
        `You are already on the waitlist for this slot (position ${existing.position})`,
      );
    }

    // Compute position inside transaction so concurrent joins don't collide
    const entry = await this.ds.transaction(async (manager) => {
      const [{ max }] = await manager.query<[{ max: number | null }]>(
        `SELECT MAX(position) AS max FROM waitlist_entries
         WHERE slot_id = $1 AND tenant_id = $2
           AND status = 'waiting' AND is_deleted = FALSE`,
        [dto.slotId, tenantId],
      );
      const position = (max ?? 0) + 1;

      return manager.save(
        manager.create(WaitlistEntryEntity, {
          tenantId,
          slotId:        dto.slotId,
          courtId:       dto.courtId,
          branchId:      dto.branchId,
          userId:        dto.userId        ?? null,
          customerId:    dto.customerId    ?? null,
          customerName:  dto.customerName,
          customerEmail: dto.customerEmail ?? null,
          customerPhone: dto.customerPhone ?? null,
          position,
          status:        'waiting',
          notes:         dto.notes         ?? null,
        }),
      );
    });

    this.logger.log(
      `Waitlist join — slot=${dto.slotId} pos=${entry.position} tenant=${tenantId}`,
    );
    return entry;
  }

  /**
   * leave()
   *
   * Removes the customer from the waitlist.
   * Only 'waiting' entries can be cancelled. Promoted/booked entries are terminal.
   */
  async leave(id: string, tenantId: string): Promise<void> {
    const entry = await this.findOne(id, tenantId);
    if (entry.status !== 'waiting') {
      throw new BadRequestException(
        `Cannot leave waitlist — entry status is '${entry.status}'`,
      );
    }
    await this.waitlistRepository.softDelete(id, tenantId);
    this.logger.log(`Waitlist leave — id=${id} tenant=${tenantId}`);
  }

  async findOne(id: string, tenantId: string): Promise<WaitlistEntryEntity> {
    const entry = await this.waitlistRepository.findById(id, tenantId);
    if (!entry) throw new NotFoundException(`Waitlist entry ${id} not found`);
    return entry;
  }

  async findBySlot(slotId: string, tenantId: string): Promise<WaitlistEntryEntity[]> {
    return this.waitlistRepository.findBySlot(slotId, tenantId);
  }

  async findByCustomer(
    customerId: string,
    tenantId:   string,
  ): Promise<WaitlistEntryEntity[]> {
    return this.waitlistRepository.findByCustomer(customerId, tenantId);
  }

  async findAll(tenantId: string, query: WaitlistQueryDto): Promise<WaitlistListResult> {
    const limit  = query.limit  ?? 20;
    const offset = query.offset ?? 0;

    const params: unknown[] = [tenantId];
    const wheres: string[]  = ['tenant_id = $1', 'is_deleted = FALSE'];

    if (query.slotId)    { params.push(query.slotId);    wheres.push(`slot_id = $${params.length}`); }
    if (query.customerId){ params.push(query.customerId); wheres.push(`customer_id = $${params.length}`); }
    if (query.courtId)   { params.push(query.courtId);   wheres.push(`court_id = $${params.length}`); }
    if (query.status)    { params.push(query.status);    wheres.push(`status = $${params.length}`); }

    const where = wheres.join(' AND ');

    const [countRows, dataRows] = await Promise.all([
      this.ds.query<[{ count: string }]>(
        `SELECT COUNT(*)::int AS count FROM waitlist_entries WHERE ${where}`, params,
      ),
      this.ds.query<WaitlistEntryEntity[]>(
        `SELECT * FROM waitlist_entries WHERE ${where}
         ORDER BY position ASC, created_at ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ]);

    return { data: dataRows, total: Number(countRows[0]?.count ?? 0) };
  }

  // ── Promotion ─────────────────────────────────────────────────────────────

  /**
   * promoteNext()
   *
   * Tries to promote the first 'waiting' entry for a slot.
   * Steps:
   *   1. Find the first waiting entry by position.
   *   2. Re-check the slot is available (may have been taken by someone else).
   *   3. Reserve the slot for the promoted customer.
   *   4. Transition entry to 'promoted' and set promotedUntil.
   *   5. Emit BookingEvents.CONFIRMED event for notification dispatch.
   *
   * Returns the promoted entry, or null when no candidates exist or the
   * slot was retaken concurrently.
   */
  async promoteNext(slotId: string, tenantId: string): Promise<WaitlistEntryEntity | null> {
    const candidate = await this.waitlistRepository.firstWaiting(slotId, tenantId);
    if (!candidate) return null;

    // Re-check slot availability under a row lock
    const promoted = await this.ds.transaction(async (manager) => {
      const [slot] = await manager.query<SlotEntity[]>(
        `SELECT * FROM slots
         WHERE id = $1 AND tenant_id = $2 AND status = 'available' AND is_deleted = FALSE
         FOR UPDATE SKIP LOCKED`,
        [slotId, tenantId],
      );

      if (!slot) {
        // Slot was retaken between the SLOTS_RELEASED event and this transaction
        return null;
      }

      // Reserve the slot
      const promotedUntil = new Date(
        Date.now() + this.reservationTtlMins * 60_000,
      );
      await manager.update(SlotEntity, { id: slotId, tenantId }, {
        status:       'reserved',
        reservedUntil: promotedUntil,
        updatedAt:    new Date(),
      });

      // Promote the entry
      await manager.update(WaitlistEntryEntity, { id: candidate.id, tenantId }, {
        status:       'promoted',
        promotedAt:   new Date(),
        promotedUntil,
        updatedAt:    new Date(),
      });

      return manager.findOneOrFail(WaitlistEntryEntity, {
        where: { id: candidate.id, tenantId },
      });
    });

    if (!promoted) return null;

    this.logger.log(
      `Waitlist promoted — entry=${promoted.id} slot=${slotId} ` +
      `customer=${promoted.customerName} until=${promoted.promotedUntil?.toISOString()}`,
    );

    // Emit CONFIRMED so communication-service sends the promotion notification
    await this.eventEmitter.emitAsync(BookingEvents.CONFIRMED, {
      tenantId,
      bookingId:  promoted.id,   // waitlist entry id as proxy — no booking yet
      actorId:    'waitlist',
      timestamp:  new Date().toISOString(),
      // Extra context picked up by the notification listener
      _waitlistPromotion: true,
      customerEmail:      promoted.customerEmail,
      customerName:       promoted.customerName,
      slotId,
    });

    return promoted;
  }

  /**
   * markBooked()
   *
   * Called when a promoted customer successfully completes the booking.
   * Transitions the waitlist entry to 'booked' and stamps the booking ID.
   */
  async markBooked(
    entryId:   string,
    tenantId:  string,
    bookingId: string,
  ): Promise<void> {
    await this.waitlistRepository.update(entryId, tenantId, {
      status:    'booked',
      bookingId,
    });
  }

  // ── Event listener ────────────────────────────────────────────────────────

  /**
   * onSlotsReleased()
   *
   * Listens for SlotEvents.SLOTS_RELEASED — emitted by BookingService
   * whenever a booking is cancelled or expires.
   *
   * For each released slotId, fires promoteNext() if any waitlist entries exist.
   * Non-fatal: logs and continues on per-slot errors.
   */
  @OnEvent(SlotEvents.SLOTS_RELEASED)
  async onSlotsReleased(payload: SlotsReleasedPayload): Promise<void> {
    const { tenantId, slotIds, reason } = payload;
    this.logger.debug(
      `[waitlist] SLOTS_RELEASED — ${slotIds.length} slot(s) released (${reason})`,
    );

    for (const slotId of slotIds) {
      try {
        const promoted = await this.promoteNext(slotId, tenantId);
        if (promoted) {
          this.logger.log(
            `[waitlist] Auto-promoted entry=${promoted.id} for slot=${slotId}`,
          );
        }
      } catch (err: unknown) {
        this.logger.warn(
          `[waitlist] promoteNext failed for slot=${slotId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  // ── Scheduler: expire stale promotions ───────────────────────────────────

  /**
   * sweepExpiredPromotions()
   *
   * Runs every minute. Finds promoted entries whose promotedUntil < now,
   * resets them to 'expired', releases the reserved slot back to 'available',
   * and immediately tries to promote the next candidate.
   */
  @Cron('* * * * *')
  async sweepExpiredPromotions(): Promise<void> {
    try {
      const expired = await this.waitlistRepository.findExpiredPromotions(50);
      if (!expired.length) return;

      this.logger.log(`[waitlist:sweep] Expiring ${expired.length} promotion(s)`);

      for (const entry of expired) {
        try {
          await this.ds.transaction(async (manager) => {
            // Mark entry expired
            await manager.update(WaitlistEntryEntity,
              { id: entry.id, tenantId: entry.tenantId },
              { status: 'expired', updatedAt: new Date() },
            );

            // Release the reserved slot
            await manager.update(SlotEntity,
              { id: entry.slotId, tenantId: entry.tenantId },
              { status: 'available', reservedUntil: null, updatedAt: new Date() },
            );
          });

          this.logger.log(
            `[waitlist:sweep] Entry ${entry.id} expired — re-promoting slot ${entry.slotId}`,
          );

          // Try promoting the next candidate (outside the transaction so errors don't roll back expiry)
          await this.promoteNext(entry.slotId, entry.tenantId);
        } catch (err: unknown) {
          this.logger.warn(
            `[waitlist:sweep] Failed to expire entry ${entry.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(
        `[waitlist:sweep] Sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

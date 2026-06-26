import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }  from '@nestjs/event-emitter';
import { CourtRepository } from '../repositories/court.repository';
import { BranchService }   from '../../branch/services/branch.service';
import { SportService }    from '../../sport/services/sport.service';
import type {
  CreateCourtDto,
  UpdateCourtDto,
  CourtStatusDto,
  MaintenanceDto,
  GenerateCourtsDto,
} from '../dto/create-court.dto';
import type { CourtEntity, CourtStatus } from '../entities/court.entity';
import type { WeeklyTimings } from '../../branch/entities/branch.entity';
import {
  CourtEventNames,
  type CourtEventPayload,
} from '../events/court.events';

/** State machine: allowed transitions from each status */
const ALLOWED_TRANSITIONS: Record<CourtStatus, CourtStatus[]> = {
  available:   ['unavailable', 'maintenance', 'retired'],
  unavailable: ['available',   'maintenance', 'retired'],
  maintenance: ['available',   'unavailable', 'retired'],
  retired:     [],  // permanent — cannot be reactivated
};

@Injectable()
export class CourtService {
  private readonly logger = new Logger(CourtService.name);

  constructor(
    private readonly courtRepository: CourtRepository,
    private readonly branchService:   BranchService,
    private readonly sportService:    SportService,
    private readonly eventEmitter:    EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto:      CreateCourtDto,
    tenantId: string,
    actorId:  string,
  ): Promise<CourtEntity> {
    // Validate branch membership
    await this.assertBranchBelongsToTenant(dto.branchId, tenantId);

    // Validate sport membership if provided
    if (dto.sportId) {
      await this.assertSportBelongsToTenant(dto.sportId, tenantId);
    }

    // Name uniqueness per branch
    if (await this.courtRepository.isNameTakenInBranch(dto.name, dto.branchId, tenantId)) {
      throw new ConflictException(
        `A court named "${dto.name}" already exists in this branch`,
      );
    }

    // Validate operating hours format if provided
    if (dto.operatingHours) {
      this.validateOperatingHours(dto.operatingHours as WeeklyTimings);
    }

    const court = await this.courtRepository.insert(
      {
        tenantId,
        branchId:             dto.branchId,
        sportId:              dto.sportId              ?? null,
        name:                 dto.name,
        code:                 dto.code                 ?? null,
        description:          dto.description          ?? null,
        courtType:            dto.courtType            ?? 'indoor',
        surfaceType:          dto.surfaceType          ?? 'hard_court',
        capacity:             dto.capacity             ?? null,
        maxBookingsConcurrent: dto.maxBookingsConcurrent ?? 1,
        dimensions:           dto.dimensions           ?? null,
        status:               dto.status               ?? 'available',
        operatingHours:       (dto.operatingHours as WeeklyTimings) ?? null,
        courtNumber:          dto.courtNumber          ?? null,
        sortOrder:            dto.sortOrder            ?? 0,
        imageUrl:             dto.imageUrl             ?? null,
        amenities:            dto.amenities            ?? null,
        hourlyRateMinor:      dto.hourlyRateMinor      ?? null,
        maintenanceNote:      null,
        maintenanceStartedAt: null,
        maintenanceExpectedEnd: null,
      } as unknown as Parameters<typeof this.courtRepository.insert>[0],
      tenantId,
    );

    await this.emit(CourtEventNames.CREATED, {
      tenantId, courtId: court.id, branchId: court.branchId, actorId,
    });

    this.logger.log(
      `Court created: ${court.id} "${court.name}" branch=${court.branchId} tenant=${tenantId}`,
    );

    return court;
  }

  // ── Bulk generation ────────────────────────────────────────────────────────

  /**
   * Generates multiple courts atomically in a single transaction.
   *
   * Naming: `{namePrefix}{separator}{number}` for each court.
   * Skips names that already exist in the branch (idempotent).
   *
   * Returns:
   *   courts:  created court entities
   *   created: number of courts successfully created
   *   skipped: number of names that were already taken
   */
  async generateCourts(
    dto:      GenerateCourtsDto,
    tenantId: string,
    actorId:  string,
  ): Promise<{ courts: CourtEntity[]; created: number; skipped: number }> {
    // Validate branch
    await this.assertBranchBelongsToTenant(dto.branchId, tenantId);

    // Validate sport if provided
    if (dto.sportId) {
      await this.assertSportBelongsToTenant(dto.sportId, tenantId);
    }

    // Validate operating hours
    if (dto.operatingHours) {
      this.validateOperatingHours(dto.operatingHours as WeeklyTimings);
    }

    // Pre-fetch existing names to detect collisions without DB round-trips per court
    const existingNames = await this.courtRepository.getExistingNamesForBranch(
      dto.branchId,
      tenantId,
    );

    const separator   = dto.separator   ?? ' ';
    const startNumber = dto.startNumber ?? 1;
    const currentCount = await this.courtRepository.countByBranch(dto.branchId, tenantId);

    // Build the list of courts to create
    const toCreate: Array<{
      name:        string;
      courtNumber: number;
      sortOrder:   number;
    }> = [];
    let skipped = 0;

    for (let i = 0; i < dto.count; i++) {
      const num  = startNumber + i;
      const name = `${dto.namePrefix}${separator}${num}`;

      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }

      toCreate.push({
        name,
        courtNumber: num,
        sortOrder:   currentCount + toCreate.length,
      });
    }

    if (toCreate.length === 0) {
      return { courts: [], created: 0, skipped };
    }

    // Execute all inserts in a single transaction
    const createdCourts = await this.courtRepository['entityManager'].transaction(
      async (manager) => {
        const { CourtEntity: CE } = await import('../entities/court.entity');
        const results: CourtEntity[] = [];

        for (const item of toCreate) {
          const entity = manager.create(CE, {
            tenantId,
            branchId:             dto.branchId,
            sportId:              dto.sportId              ?? null,
            name:                 item.name,
            code:                 null,
            description:          null,
            courtType:            dto.courtType            ?? 'indoor',
            surfaceType:          dto.surfaceType          ?? 'hard_court',
            capacity:             dto.capacity             ?? null,
            maxBookingsConcurrent: 1,
            dimensions:           null,
            status:               'available',
            operatingHours:       (dto.operatingHours as WeeklyTimings) ?? null,
            courtNumber:          item.courtNumber,
            sortOrder:            item.sortOrder,
            imageUrl:             null,
            amenities:            null,
            hourlyRateMinor:      null,
            maintenanceNote:      null,
            maintenanceStartedAt: null,
            maintenanceExpectedEnd: null,
            isDeleted:            false,
          });

          results.push(await manager.save(CE, entity));
        }

        return results;
      },
    );

    await this.eventEmitter.emitAsync(CourtEventNames.BULK_GENERATED, {
      tenantId,
      branchId:  dto.branchId,
      courtIds:  createdCourts.map((c) => c.id),
      count:     createdCourts.length,
      skipped,
      actorId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Bulk courts generated: created=${createdCourts.length} skipped=${skipped} ` +
      `branch=${dto.branchId} tenant=${tenantId}`,
    );

    return { courts: createdCourts, created: createdCourts.length, skipped };
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, branchId?: string, status?: string): Promise<CourtEntity[]> {
    if (branchId) {
      return this.courtRepository.findByBranch(
        branchId,
        tenantId,
        status as CourtStatus | undefined,
      );
    }

    if (status) {
      return this.courtRepository.findByStatus(status as CourtStatus, tenantId);
    }

    return this.courtRepository.findAll(tenantId, {
      order: {
        branchId:    'ASC',
        courtNumber: 'ASC',
        sortOrder:   'ASC',
        name:        'ASC',
      } as unknown as Parameters<typeof this.courtRepository.findAll>[1] extends undefined
        ? never
        : NonNullable<Parameters<typeof this.courtRepository.findAll>[1]>['order'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<CourtEntity> {
    return this.courtRepository.findByIdOrFail(id, tenantId);
  }

  async findByBranch(
    branchId: string,
    tenantId: string,
    status?:  string,
  ): Promise<CourtEntity[]> {
    await this.assertBranchBelongsToTenant(branchId, tenantId);
    return this.courtRepository.findByBranch(branchId, tenantId, status as CourtStatus | undefined);
  }

  async findBySport(
    sportId:  string,
    tenantId: string,
    branchId?: string,
  ): Promise<CourtEntity[]> {
    return this.courtRepository.findBySport(sportId, tenantId, branchId);
  }

  async getStatusSummary(tenantId: string): Promise<Record<CourtStatus, number>> {
    return this.courtRepository.countByStatus(tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    dto:      UpdateCourtDto,
    tenantId: string,
    actorId:  string,
  ): Promise<CourtEntity> {
    const court = await this.courtRepository.findByIdOrFail(id, tenantId);

    // Validate sport if changing
    if (dto.sportId !== undefined && dto.sportId !== null) {
      await this.assertSportBelongsToTenant(dto.sportId, tenantId);
    }

    // Validate name uniqueness if changing
    if (dto.name && dto.name !== court.name) {
      if (await this.courtRepository.isNameTakenInBranch(dto.name, court.branchId, tenantId, id)) {
        throw new ConflictException(
          `A court named "${dto.name}" already exists in this branch`,
        );
      }
    }

    // Validate operating hours if updating
    if (dto.operatingHours) {
      this.validateOperatingHours(dto.operatingHours as WeeklyTimings);
    }

    // Block direct status change via update — use dedicated endpoint
    if ('status' in dto && dto.status && dto.status !== court.status) {
      throw new BadRequestException(
        'Use PATCH /courts/:id/status to change court status',
      );
    }

    const updated = await this.courtRepository.updateById(
      id,
      {
        ...(dto.sportId      !== undefined && { sportId: dto.sportId }),
        ...(dto.name         !== undefined && { name: dto.name }),
        ...(dto.code         !== undefined && { code: dto.code }),
        ...(dto.description  !== undefined && { description: dto.description }),
        ...(dto.courtType    !== undefined && { courtType: dto.courtType }),
        ...(dto.surfaceType  !== undefined && { surfaceType: dto.surfaceType }),
        ...(dto.capacity     !== undefined && { capacity: dto.capacity }),
        ...(dto.maxBookingsConcurrent !== undefined && { maxBookingsConcurrent: dto.maxBookingsConcurrent }),
        ...(dto.dimensions   !== undefined && { dimensions: dto.dimensions }),
        ...(dto.operatingHours !== undefined && { operatingHours: dto.operatingHours as WeeklyTimings }),
        ...(dto.sortOrder    !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.imageUrl     !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.amenities    !== undefined && { amenities: dto.amenities }),
        ...(dto.hourlyRateMinor !== undefined && { hourlyRateMinor: dto.hourlyRateMinor }),
      } as Parameters<typeof this.courtRepository.updateById>[1],
      tenantId,
    );

    await this.emit(CourtEventNames.UPDATED, {
      tenantId, courtId: id, branchId: court.branchId, actorId,
    });

    return updated;
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  async updateStatus(
    id:       string,
    dto:      CourtStatusDto,
    tenantId: string,
    actorId:  string,
  ): Promise<CourtEntity> {
    const court   = await this.courtRepository.findByIdOrFail(id, tenantId);
    const allowed = ALLOWED_TRANSITIONS[court.status] ?? [];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition court from "${court.status}" to "${dto.status}". ` +
        `Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }

    // Clearing maintenance state when transitioning away
    const clearMaintenance = court.status === 'maintenance' && dto.status !== 'maintenance';
    const previousStatus   = court.status;

    await this.courtRepository.updateById(
      id,
      {
        status: dto.status,
        ...(clearMaintenance && {
          maintenanceNote:        null,
          maintenanceStartedAt:   null,
          maintenanceExpectedEnd: null,
        }),
      } as Parameters<typeof this.courtRepository.updateById>[1],
      tenantId,
    );

    const updated = await this.courtRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(CourtEventNames.STATUS_CHANGED, {
      tenantId, courtId: id, branchId: court.branchId, actorId,
      from: previousStatus, to: dto.status,
      timestamp: new Date().toISOString(),
    });

    if (clearMaintenance) {
      await this.eventEmitter.emitAsync(CourtEventNames.MAINTENANCE_RESOLVED, {
        tenantId, courtId: id, branchId: court.branchId, actorId,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(
      `Court status: ${id} ${previousStatus} → ${dto.status} tenant=${tenantId}`,
    );

    return updated;
  }

  // ── Maintenance ────────────────────────────────────────────────────────────

  /**
   * Sets a court into maintenance with a required reason.
   * Dedicated endpoint for explicitness and audit clarity.
   */
  async setMaintenance(
    id:       string,
    dto:      MaintenanceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<CourtEntity> {
    const court = await this.courtRepository.findByIdOrFail(id, tenantId);

    if (court.status === 'retired') {
      throw new BadRequestException('A retired court cannot be placed in maintenance');
    }

    await this.courtRepository.updateById(
      id,
      {
        status:                 'maintenance',
        maintenanceNote:        dto.maintenanceNote,
        maintenanceStartedAt:   new Date(),
        maintenanceExpectedEnd: dto.maintenanceExpectedEnd
          ? new Date(dto.maintenanceExpectedEnd)
          : null,
      } as Parameters<typeof this.courtRepository.updateById>[1],
      tenantId,
    );

    const updated = await this.courtRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(CourtEventNames.MAINTENANCE_STARTED, {
      tenantId, courtId: id, branchId: court.branchId, actorId,
      maintenanceNote:        dto.maintenanceNote,
      maintenanceExpectedEnd: dto.maintenanceExpectedEnd ?? null,
      timestamp:              new Date().toISOString(),
    });

    this.logger.log(
      `Court maintenance started: ${id} tenant=${tenantId} reason="${dto.maintenanceNote}"`,
    );

    return updated;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    const court = await this.courtRepository.findByIdOrFail(id, tenantId);

    if (court.status === 'available') {
      throw new BadRequestException(
        'An available court cannot be deleted. Set it to unavailable or retired first.',
      );
    }

    await this.courtRepository.softDelete(id, tenantId);

    await this.emit(CourtEventNames.DELETED, {
      tenantId, courtId: id, branchId: court.branchId, actorId,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertBranchBelongsToTenant(
    branchId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await this.branchService.findOne(branchId, tenantId);
    } catch {
      throw new UnprocessableEntityException(
        `Branch ${branchId} not found in this organisation`,
      );
    }
  }

  private async assertSportBelongsToTenant(
    sportId:  string,
    tenantId: string,
  ): Promise<void> {
    try {
      await this.sportService.findOne(sportId, tenantId);
    } catch {
      throw new UnprocessableEntityException(
        `Sport ${sportId} not found in this organisation`,
      );
    }
  }

  /**
   * Validates the operating hours object has all 7 days with valid time format.
   * Times must be HH:MM and openTime must be before closeTime for open days.
   * Delegates to the same validation logic used by BranchService, including
   * multi-session, break period, and maintenance block validation.
   */
  private validateOperatingHours(hours: WeeklyTimings): void {
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const day of DAYS) {
      const d = hours[day as keyof WeeklyTimings];
      if (!d) continue; // partial override allowed

      if (typeof d.openTime === 'string' && !TIME_RE.test(d.openTime)) {
        throw new UnprocessableEntityException(
          `Invalid openTime for ${day}: "${d.openTime}" — must be HH:MM format`,
        );
      }

      if (typeof d.closeTime === 'string' && !TIME_RE.test(d.closeTime)) {
        throw new UnprocessableEntityException(
          `Invalid closeTime for ${day}: "${d.closeTime}" — must be HH:MM format`,
        );
      }

      if (
        !d.isClosed &&
        typeof d.openTime  === 'string' &&
        typeof d.closeTime === 'string' &&
        d.openTime >= d.closeTime
      ) {
        throw new UnprocessableEntityException(
          `Invalid hours for ${day}: openTime (${d.openTime}) must be before closeTime (${d.closeTime})`,
        );
      }
    }
  }

  private async emit(
    event:   CourtEventNames,
    payload: Omit<CourtEventPayload, 'timestamp'>,
  ): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(event, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Failed to emit ${event}: ${String(err)}`);
    }
  }
}

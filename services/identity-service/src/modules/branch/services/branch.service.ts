import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BranchRepository }  from '../repositories/branch.repository';
import { UserRepository }    from '../../user/repositories/user.repository';
import type {
  CreateBranchDto,
  UpdateBranchDto,
  AssignManagerDto,
  BranchStatusDto,
} from '../dto/create-branch.dto';
import type { BranchEntity, WeeklyTimings } from '../entities/branch.entity';
import {
  BranchEventNames,
  type BranchEventPayload,
} from '../events/branch.events';

// Default timings applied on create when none supplied
const DEFAULT_TIMINGS = {
  monday:    { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  tuesday:   { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  wednesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  thursday:  { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  friday:    { isClosed: false, openTime: '09:00', closeTime: '17:00' },
  saturday:  { isClosed: true,  openTime: '09:00', closeTime: '17:00' },
  sunday:    { isClosed: true,  openTime: '09:00', closeTime: '17:00' },
};

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly userRepository:   UserRepository,
    private readonly eventEmitter:     EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto:      CreateBranchDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BranchEntity> {
    // Slug uniqueness
    if (await this.branchRepository.isSlugTaken(dto.slug, tenantId)) {
      throw new ConflictException(
        `A branch with slug "${dto.slug}" already exists in this organisation`,
      );
    }

    // Manager must belong to the same tenant
    if (dto.managerUserId) {
      await this.assertManagerBelongsToTenant(dto.managerUserId, tenantId);
    }

    // Timing validation
    const timings = dto.timings ?? DEFAULT_TIMINGS;
    this.validateTimings(timings as WeeklyTimings);

    const branch = await this.branchRepository.insert(
      {
        tenantId,
        name:          dto.name,
        slug:          dto.slug,
        description:   dto.description    ?? null,
        addressLine1:  dto.addressLine1,
        addressLine2:  dto.addressLine2   ?? null,
        city:          dto.city,
        county:        dto.county         ?? null,
        postcode:      dto.postcode,
        countryCode:   dto.countryCode    ?? 'GB',
        latitude:      dto.latitude       ?? null,
        longitude:     dto.longitude      ?? null,
        geoLabel:      dto.geoLabel       ?? null,
        phone:         dto.phone          ?? null,
        email:         dto.email          ?? null,
        website:       dto.website        ?? null,
        managerUserId: dto.managerUserId  ?? null,
        status:        dto.status         ?? 'active',
        timings,
        mapUrl:        dto.mapUrl         ?? null,
        facilities:    dto.facilities     ?? null,
        imageUrl:      dto.imageUrl       ?? null,
        sortOrder:     dto.sortOrder      ?? 0,
      } as unknown as Parameters<typeof this.branchRepository.insert>[0],
      tenantId,
    );

    await this.emit(BranchEventNames.CREATED, { tenantId, branchId: branch.id, actorId });
    this.logger.log(`Branch created: ${branch.id} slug="${branch.slug}" tenant=${tenantId}`);
    return branch;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    status?: string,
  ): Promise<BranchEntity[]> {
    if (status) {
      return this.branchRepository.findByStatus(
        status as BranchEntity['status'],
        tenantId,
      );
    }

    return this.branchRepository.findAll(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<BranchEntity> {
    return this.branchRepository.findByIdOrFail(id, tenantId);
  }

  async findBySlug(slug: string, tenantId: string): Promise<BranchEntity> {
    const branch = await this.branchRepository.findBySlug(slug, tenantId);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${slug}" not found`);
    }
    return branch;
  }

  async getStatusSummary(
    tenantId: string,
  ): Promise<Record<BranchEntity['status'], number>> {
    return this.branchRepository.countByStatus(tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    dto:      UpdateBranchDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BranchEntity> {
    await this.branchRepository.findByIdOrFail(id, tenantId);

    // Validate timing if provided
    if (dto.timings) {
      this.validateTimings(dto.timings as WeeklyTimings);
    }

    // Manager cross-tenant check
    if (dto.managerUserId !== undefined && dto.managerUserId !== null) {
      await this.assertManagerBelongsToTenant(dto.managerUserId, tenantId);
    }

    const updated = await this.branchRepository.updateById(
      id,
      dto as unknown as Parameters<typeof this.branchRepository.updateById>[1],
      tenantId,
    );

    await this.emit(BranchEventNames.UPDATED, { tenantId, branchId: id, actorId });
    return updated;
  }

  // ── Manager assignment ─────────────────────────────────────────────────────

  /**
   * Assigns or removes the branch manager.
   * Setting managerUserId to null removes the current manager.
   */
  async assignManager(
    id:       string,
    dto:      AssignManagerDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BranchEntity> {
    const branch = await this.branchRepository.findByIdOrFail(id, tenantId);

    if (dto.managerUserId !== null && dto.managerUserId !== undefined) {
      await this.assertManagerBelongsToTenant(dto.managerUserId, tenantId);
    }

    const previousManagerUserId = branch.managerUserId;

    const updated = await this.branchRepository.updateById(
      id,
      { managerUserId: dto.managerUserId ?? null } as unknown as Parameters<typeof this.branchRepository.updateById>[1],
      tenantId,
    );

    const eventName = dto.managerUserId
      ? BranchEventNames.MANAGER_ASSIGNED
      : BranchEventNames.MANAGER_REMOVED;

    await this.eventEmitter.emitAsync(eventName, {
      tenantId,
      branchId:              id,
      actorId,
      managerUserId:         dto.managerUserId ?? null,
      previousManagerUserId,
      timestamp:             new Date().toISOString(),
    });

    return updated;
  }

  // ── Status transition ──────────────────────────────────────────────────────

  async updateStatus(
    id:       string,
    dto:      BranchStatusDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BranchEntity> {
    const branch = await this.branchRepository.findByIdOrFail(id, tenantId);

    // Cannot transition an archived branch to any other state
    if (branch.status === 'archived' && dto.status !== 'archived') {
      throw new BadRequestException(
        'An archived branch cannot be reactivated. Create a new branch instead.',
      );
    }

    const previousStatus = branch.status;

    const updated = await this.branchRepository.updateById(
      id,
      { status: dto.status } as unknown as Parameters<typeof this.branchRepository.updateById>[1],
      tenantId,
    );

    await this.eventEmitter.emitAsync(BranchEventNames.STATUS_CHANGED, {
      tenantId,
      branchId:  id,
      actorId,
      from:      previousStatus,
      to:        dto.status,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Branch status: ${id} ${previousStatus} → ${dto.status} tenant=${tenantId}`,
    );
    return updated;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async remove(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    const branch = await this.branchRepository.findByIdOrFail(id, tenantId);

    if (branch.status === 'active') {
      throw new BadRequestException(
        'An active branch cannot be deleted. Set it to inactive or archived first.',
      );
    }

    await this.branchRepository.softDelete(id, tenantId);
    await this.emit(BranchEventNames.DELETED, { tenantId, branchId: id, actorId });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates that the proposed manager exists and belongs to the tenant.
   * Throws 422 if not found — prevents cross-tenant assignment.
   */
  private async assertManagerBelongsToTenant(
    managerUserId: string,
    tenantId:      string,
  ): Promise<void> {
    const user = await this.userRepository.findByIdAndTenant(managerUserId, tenantId);
    if (!user) {
      throw new UnprocessableEntityException(
        `User ${managerUserId} not found in this organisation. ` +
        'Manager must be an existing user in the same organisation.',
      );
    }
  }

  /**
   * Validates that each day's openTime < closeTime (when not closed).
   * Times are HH:MM strings; lexicographic comparison is valid for 24h format.
   *
   * Validates:
   *   - openTime < closeTime for the primary window
   *   - Each session: start < end, sessions fall within primary window
   *   - Sessions do not overlap each other
   *   - Breaks fall within their containing session
   *   - Maintenance blocks: start < end, do not overlap each other
   */
  private validateTimings(timings: WeeklyTimings): void {
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of DAYS) {
      const t = timings[day];
      if (!t || t.isClosed) continue;

      // Primary window
      if (t.openTime >= t.closeTime) {
        throw new UnprocessableEntityException(
          `Invalid timings for ${day}: openTime (${t.openTime}) must be before closeTime (${t.closeTime})`,
        );
      }

      // Validate sessions
      if (t.sessions && t.sessions.length > 0) {
        for (const [i, session] of t.sessions.entries()) {
          if (session.start >= session.end) {
            throw new UnprocessableEntityException(
              `${day} session[${i}]: start (${session.start}) must be before end (${session.end})`,
            );
          }
          if (session.start < t.openTime || session.end > t.closeTime) {
            throw new UnprocessableEntityException(
              `${day} session[${i}] (${session.start}–${session.end}) must fall within ` +
              `operating hours (${t.openTime}–${t.closeTime})`,
            );
          }
          // Breaks must fall within session
          if (session.breaks) {
            for (const [j, br] of session.breaks.entries()) {
              if (br.start >= br.end) {
                throw new UnprocessableEntityException(
                  `${day} session[${i}] break[${j}]: start must be before end`,
                );
              }
              if (br.start < session.start || br.end > session.end) {
                throw new UnprocessableEntityException(
                  `${day} session[${i}] break[${j}] (${br.start}–${br.end}) ` +
                  `must fall within session (${session.start}–${session.end})`,
                );
              }
            }
          }
        }
        // Sessions must not overlap
        const sorted = [...t.sessions].sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 0; i < sorted.length - 1; i++) {
          const cur  = sorted[i]!;
          const next = sorted[i + 1]!;
          if (cur.end > next.start) {
            throw new UnprocessableEntityException(
              `${day}: sessions overlap — session ending at ${cur.end} ` +
              `conflicts with session starting at ${next.start}`,
            );
          }
        }
      }

      // Validate maintenance blocks
      if (t.maintenanceBlocks && t.maintenanceBlocks.length > 0) {
        for (const [i, block] of t.maintenanceBlocks.entries()) {
          if (block.start >= block.end) {
            throw new UnprocessableEntityException(
              `${day} maintenanceBlock[${i}]: start must be before end`,
            );
          }
        }
        // Maintenance blocks must not overlap
        const sortedBlocks = [...t.maintenanceBlocks].sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 0; i < sortedBlocks.length - 1; i++) {
          const cur  = sortedBlocks[i]!;
          const next = sortedBlocks[i + 1]!;
          if (cur.end > next.start) {
            throw new UnprocessableEntityException(
              `${day}: maintenance blocks overlap at ${cur.end}`,
            );
          }
        }
      }
    }
  }

  private async emit(
    event:   BranchEventNames,
    payload: Omit<BranchEventPayload, 'timestamp'>,
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

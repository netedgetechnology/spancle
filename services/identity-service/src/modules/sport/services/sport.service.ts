import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }        from '@nestjs/event-emitter';
import { SportRepository }       from '../repositories/sport.repository';
import { SportBranchRepository } from '../repositories/sport-branch.repository';
import { BranchService }         from '../../branch/services/branch.service';
import type {
  CreateSportDto,
  UpdateSportDto,
  AssignBranchesDto,
  SportStatusDto,
} from '../dto/create-sport.dto';
import type { SportEntity }      from '../entities/sport.entity';
import type { SportBranchEntity } from '../entities/sport-branch.entity';
import {
  SportEventNames,
  type SportEventPayload,
} from '../events/sport.events';

/**
 * SportResponse — sport entity augmented with its branch IDs.
 * Returned by all read operations so the frontend always has branch context.
 */
export interface SportResponse extends SportEntity {
  branchIds: string[];
}

@Injectable()
export class SportService {
  private readonly logger = new Logger(SportService.name);

  constructor(
    private readonly sportRepository:       SportRepository,
    private readonly sportBranchRepository: SportBranchRepository,
    private readonly branchService:         BranchService,
    private readonly eventEmitter:          EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto:      CreateSportDto,
    tenantId: string,
    actorId:  string,
  ): Promise<SportResponse> {
    // Slug uniqueness per tenant
    if (await this.sportRepository.isSlugTaken(dto.slug, tenantId)) {
      throw new ConflictException(
        `A sport with slug "${dto.slug}" already exists in this organisation`,
      );
    }

    // Validate branches before creating the sport
    if (dto.branchIds && dto.branchIds.length > 0) {
      await this.assertBranchesBelongToTenant(dto.branchIds, tenantId);
    }

    const sport = await this.sportRepository.insert(
      {
        tenantId,
        name:        dto.name,
        slug:        dto.slug,
        description: dto.description ?? null,
        icon:        dto.icon        ?? null,
        color:       dto.color       ?? null,
        config:      dto.config      ?? {},
        status:      dto.status      ?? 'active',
        sortOrder:   dto.sortOrder   ?? 0,
      } as unknown as Parameters<typeof this.sportRepository.insert>[0],
      tenantId,
    );

    // Assign initial branches if provided
    if (dto.branchIds && dto.branchIds.length > 0) {
      await this.sportBranchRepository.replaceBranchMappings(
        sport.id,
        dto.branchIds,
        tenantId,
      );
    }

    await this.emit(SportEventNames.CREATED, { tenantId, sportId: sport.id, actorId });
    this.logger.log(`Sport created: ${sport.id} slug="${sport.slug}" tenant=${tenantId}`);

    return this.withBranches(sport, tenantId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, status?: string): Promise<SportResponse[]> {
    const sports = status
      ? await this.sportRepository.findByStatus(
          status as SportEntity['status'],
          tenantId,
        )
      : await this.sportRepository.findAll(tenantId, {
          order: { sortOrder: 'ASC', name: 'ASC' } as Parameters<typeof this.sportRepository.findAll>[1] extends undefined ? never : NonNullable<Parameters<typeof this.sportRepository.findAll>[1]>['order'],
        });

    return Promise.all(sports.map((s) => this.withBranches(s, tenantId)));
  }

  async findOne(id: string, tenantId: string): Promise<SportResponse> {
    const sport = await this.sportRepository.findByIdOrFail(id, tenantId);
    return this.withBranches(sport, tenantId);
  }

  async findBySlug(slug: string, tenantId: string): Promise<SportResponse> {
    const sport = await this.sportRepository.findBySlug(slug, tenantId);
    if (!sport) throw new NotFoundException(`Sport with slug "${slug}" not found`);
    return this.withBranches(sport, tenantId);
  }

  async findByBranch(branchId: string, tenantId: string): Promise<SportResponse[]> {
    const sports = await this.sportRepository.findByBranch(branchId, tenantId);
    return Promise.all(sports.map((s) => this.withBranches(s, tenantId)));
  }

  async getStatusSummary(
    tenantId: string,
  ): Promise<Record<SportEntity['status'], number>> {
    return this.sportRepository.countByStatus(tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    dto:      UpdateSportDto,
    tenantId: string,
    actorId:  string,
  ): Promise<SportResponse> {
    await this.sportRepository.findByIdOrFail(id, tenantId);

    // Merge config — never full-replace
    let mergedConfig: Record<string, unknown> | undefined;
    if (dto.config !== undefined) {
      const current = await this.sportRepository.findByIdOrFail(id, tenantId);
      mergedConfig  = { ...current.config, ...dto.config };
    }

    const updated = await this.sportRepository.updateById(
      id,
      {
        ...(dto.name        !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon        !== undefined && { icon: dto.icon }),
        ...(dto.color       !== undefined && { color: dto.color }),
        ...(mergedConfig    !== undefined && { config: mergedConfig }),
        ...(dto.status      !== undefined && { status: dto.status }),
        ...(dto.sortOrder   !== undefined && { sortOrder: dto.sortOrder }),
      } as Parameters<typeof this.sportRepository.updateById>[1],
      tenantId,
    );

    await this.emit(SportEventNames.UPDATED, { tenantId, sportId: id, actorId });
    return this.withBranches(updated, tenantId);
  }

  // ── Status transition ──────────────────────────────────────────────────────

  async updateStatus(
    id:       string,
    dto:      SportStatusDto,
    tenantId: string,
    actorId:  string,
  ): Promise<SportResponse> {
    const sport = await this.sportRepository.findByIdOrFail(id, tenantId);
    const from  = sport.status;

    const updated = await this.sportRepository.updateById(
      id,
      { status: dto.status } as Parameters<typeof this.sportRepository.updateById>[1],
      tenantId,
    );

    await this.eventEmitter.emitAsync(SportEventNames.STATUS_CHANGED, {
      tenantId,
      sportId:   id,
      actorId,
      from,
      to:        dto.status,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Sport status: ${id} ${from} → ${dto.status} tenant=${tenantId}`,
    );

    return this.withBranches(updated, tenantId);
  }

  // ── Branch assignment ──────────────────────────────────────────────────────

  /**
   * Replaces the full set of branch mappings for a sport.
   *
   * Uses replace strategy (soft-delete all + insert new) to ensure
   * atomicity. All provided branchIds must belong to the same tenant
   * and must not be archived.
   *
   * Passing an empty array removes all branch mappings.
   */
  async assignBranches(
    sportId:  string,
    dto:      AssignBranchesDto,
    tenantId: string,
    actorId:  string,
  ): Promise<SportResponse> {
    await this.sportRepository.findByIdOrFail(sportId, tenantId);

    const previousBranchIds = await this.sportBranchRepository.getBranchIdsForSport(
      sportId,
      tenantId,
    );

    if (dto.branchIds.length > 0) {
      await this.assertBranchesBelongToTenant(dto.branchIds, tenantId);
    }

    await this.sportBranchRepository.replaceBranchMappings(
      sportId,
      dto.branchIds,
      tenantId,
    );

    await this.eventEmitter.emitAsync(SportEventNames.BRANCHES_ASSIGNED, {
      tenantId,
      sportId,
      actorId,
      branchIds:         dto.branchIds,
      previousBranchIds,
      timestamp:         new Date().toISOString(),
    });

    this.logger.log(
      `Sport branches assigned: sport=${sportId} branches=[${dto.branchIds.join(',')}] tenant=${tenantId}`,
    );

    return this.findOne(sportId, tenantId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async remove(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    const sport = await this.sportRepository.findByIdOrFail(id, tenantId);

    if (sport.status === 'active') {
      throw new BadRequestException(
        'An active sport cannot be deleted. Set it to inactive first.',
      );
    }

    // Soft-delete all branch mappings first to avoid orphaned join rows
    await this.sportBranchRepository.deleteAllForSport(id, tenantId);
    await this.sportRepository.softDelete(id, tenantId);

    await this.emit(SportEventNames.DELETED, { tenantId, sportId: id, actorId });
    this.logger.log(`Sport deleted: ${id} tenant=${tenantId}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates that all branchIds exist within the tenant and are not archived.
   * Throws 422 if any validation fails — prevents cross-tenant assignment.
   */
  private async assertBranchesBelongToTenant(
    branchIds: string[],
    tenantId:  string,
  ): Promise<void> {
    for (const branchId of branchIds) {
      let branch: Awaited<ReturnType<typeof this.branchService.findOne>>;

      try {
        branch = await this.branchService.findOne(branchId, tenantId);
      } catch {
        throw new UnprocessableEntityException(
          `Branch ${branchId} not found in this organisation`,
        );
      }

      if (branch.status === 'archived') {
        throw new UnprocessableEntityException(
          `Branch "${branch.name}" is archived and cannot be assigned to a sport`,
        );
      }
    }
  }

  /**
   * Augments a SportEntity with its current branch ID list.
   */
  private async withBranches(sport: SportEntity, tenantId: string): Promise<SportResponse> {
    const branchIds = await this.sportBranchRepository.getBranchIdsForSport(
      sport.id,
      tenantId,
    );
    return { ...sport, branchIds };
  }

  private async emit(
    event:   SportEventNames,
    payload: Omit<SportEventPayload, 'timestamp'>,
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

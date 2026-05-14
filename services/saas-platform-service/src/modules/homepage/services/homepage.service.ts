import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HomepageSectionRepository } from '../repositories/homepage-section.repository';
import type {
  CreateHomepageSectionDto,
  UpdateHomepageSectionDto,
  ReorderSectionsDto,
  CloneSectionDto,
} from '../dto/create-homepage-section.dto';
import { HomepageSectionEntity } from '../entities/homepage-section.entity';
import {
  HomepageEventNames,
  type HomepageSectionEventPayload,
  type SectionsReorderedEventPayload,
} from '../events/homepage.events';
import {
  SECTION_SCHEMAS,
  type SectionType,
} from '../types/section-payload.types';

/** Maximum sections per page (prevents abuse) */
const MAX_SECTIONS_PER_PAGE = 20;

/** Maximum of each section type per page */
const MAX_PER_TYPE: Partial<Record<SectionType, number>> = {
  hero_banner:     1,   // Only one hero per page
  pricing_preview: 1,   // One pricing block per page
};

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(
    private readonly sectionRepo:  HomepageSectionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async createSection(
    dto:      CreateHomepageSectionDto,
    tenantId: string,
    actorId:  string,
  ): Promise<HomepageSectionEntity> {
    // 1. Validate payload against the section type's Zod schema
    const validatedPayload = this.validatePayload(dto.sectionType, dto.payload);

    // 2. Check total section count
    const total = await this.sectionRepo.count(tenantId);
    if (total >= MAX_SECTIONS_PER_PAGE) {
      throw new BadRequestException(
        `Maximum of ${MAX_SECTIONS_PER_PAGE} sections per page reached`,
      );
    }

    // 3. Check per-type limits
    const typeLimit = MAX_PER_TYPE[dto.sectionType];
    if (typeLimit !== undefined) {
      const existing = await this.sectionRepo.findByPageAndType(
        dto.pageId,
        dto.sectionType,
        tenantId,
      );
      if (existing.length >= typeLimit) {
        throw new BadRequestException(
          `Only ${typeLimit} section(s) of type "${dto.sectionType}" allowed per page`,
        );
      }
    }

    // 4. Append at end if sortOrder not provided
    const maxOrder = await this.sectionRepo.getMaxSortOrder(dto.pageId, tenantId);
    const sortOrder = dto.sortOrder ?? maxOrder + 1;

    // 5. Persist
    const section = await this.sectionRepo.insert(
      {
        tenantId,
        pageId:      dto.pageId,
        sectionType: dto.sectionType,
        adminLabel:  dto.adminLabel,
        payload:     validatedPayload,
        sortOrder,
        status:      dto.status     ?? 'draft',
        isVisible:   dto.isVisible  ?? true,
        abVariant:   dto.abVariant  ?? null,
        createdBy:   actorId,
        updatedBy:   actorId,
      } as unknown as Parameters<typeof this.sectionRepo.insert>[0],
      tenantId,
    );

    await this.emitSectionEvent(
      HomepageEventNames.SECTION_CREATED,
      section,
      actorId,
    );

    this.logger.log(
      `Section created: ${section.id} type=${section.sectionType} page=${section.pageId} tenant=${tenantId}`,
    );
    return section;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  /**
   * Returns published, visible sections for public rendering.
   * No authentication required — called from public-website SSR.
   */
  async getPublishedSections(
    pageId:   string,
    tenantId: string,
  ): Promise<HomepageSectionEntity[]> {
    return this.sectionRepo.findPublishedByPage(pageId, tenantId);
  }

  /**
   * Returns all sections (all statuses) for the admin editor.
   * Requires authenticated tenant admin.
   */
  async getAllSections(
    pageId:   string,
    tenantId: string,
  ): Promise<HomepageSectionEntity[]> {
    return this.sectionRepo.findAllByPage(pageId, tenantId);
  }

  async getSection(
    id:       string,
    tenantId: string,
  ): Promise<HomepageSectionEntity> {
    return this.sectionRepo.findByIdOrFail(id, tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateSection(
    id:       string,
    dto:      UpdateHomepageSectionDto,
    tenantId: string,
    actorId:  string,
  ): Promise<HomepageSectionEntity> {
    const existing = await this.sectionRepo.findByIdOrFail(id, tenantId);

    let validatedPayload: Record<string, unknown> | undefined;

    if (dto.payload !== undefined) {
      // Merge partial payload with existing, then validate the merged result
      const merged = { ...existing.payload, ...dto.payload };
      validatedPayload = this.validatePayload(existing.sectionType, merged);
    }

    const updated = await this.sectionRepo.updateById(
      id,
      {
        ...(dto.adminLabel !== undefined && { adminLabel: dto.adminLabel }),
        ...(validatedPayload !== undefined && { payload: validatedPayload }),
        ...(dto.sortOrder   !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.status      !== undefined && { status: dto.status }),
        ...(dto.isVisible   !== undefined && { isVisible: dto.isVisible }),
        ...(dto.abVariant   !== undefined && { abVariant: dto.abVariant }),
        updatedBy: actorId,
      } as unknown as Parameters<typeof this.sectionRepo.updateById>[1],
      tenantId,
    );

    const eventName = dto.status === 'published'
      ? HomepageEventNames.SECTION_PUBLISHED
      : dto.status === 'archived'
        ? HomepageEventNames.SECTION_ARCHIVED
        : HomepageEventNames.SECTION_UPDATED;

    await this.emitSectionEvent(eventName, updated, actorId);
    return updated;
  }

  // ── Reorder ────────────────────────────────────────────────────────────────

  /**
   * Atomically reorders all sections for a page after a drag-and-drop.
   * Validates:
   *   - All section IDs belong to the same tenantId and pageId
   *   - No duplicate IDs in the payload
   */
  async reorderSections(
    dto:      ReorderSectionsDto,
    tenantId: string,
    actorId:  string,
  ): Promise<HomepageSectionEntity[]> {
    // Check for duplicate IDs in the request
    const ids = dto.sections.map((s) => s.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException('Duplicate section IDs in reorder request');
    }

    // Validate all sections belong to this tenant and page
    const existing = await this.sectionRepo.findAllByPage(dto.pageId, tenantId);
    const existingIds = new Set(existing.map((s) => s.id));

    for (const { id } of dto.sections) {
      if (!existingIds.has(id)) {
        throw new ForbiddenException(
          `Section ${id} does not belong to page ${dto.pageId} for this tenant`,
        );
      }
    }

    await this.sectionRepo.bulkUpdateSortOrder(dto.sections, tenantId);

    const reorderedEvent: SectionsReorderedEventPayload = {
      tenantId,
      pageId:    dto.pageId,
      actorId,
      count:     dto.sections.length,
      timestamp: new Date().toISOString(),
    };
    await this.eventEmitter.emitAsync(HomepageEventNames.SECTIONS_REORDERED, reorderedEvent);

    return this.sectionRepo.findAllByPage(dto.pageId, tenantId);
  }

  // ── Clone ──────────────────────────────────────────────────────────────────

  /**
   * Clones a section — creates a new draft copy with a new adminLabel.
   * Useful for A/B testing variants of the same section.
   */
  async cloneSection(
    id:       string,
    dto:      CloneSectionDto,
    tenantId: string,
    actorId:  string,
  ): Promise<HomepageSectionEntity> {
    const source = await this.sectionRepo.findByIdOrFail(id, tenantId);

    const maxOrder = await this.sectionRepo.getMaxSortOrder(
      dto.targetPageId ?? source.pageId,
      tenantId,
    );

    const cloned = await this.sectionRepo.insert(
      {
        tenantId,
        pageId:      dto.targetPageId ?? source.pageId,
        sectionType: source.sectionType,
        adminLabel:  dto.adminLabel,
        payload:     { ...source.payload },
        sortOrder:   maxOrder + 1,
        status:      'draft',
        isVisible:   source.isVisible,
        abVariant:   source.abVariant,
        createdBy:   actorId,
        updatedBy:   actorId,
      } as unknown as Parameters<typeof this.sectionRepo.insert>[0],
      tenantId,
    );

    await this.emitSectionEvent(
      HomepageEventNames.SECTION_CLONED,
      cloned,
      actorId,
    );
    return cloned;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async removeSection(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    const section = await this.sectionRepo.findByIdOrFail(id, tenantId);
    await this.sectionRepo.softDelete(id, tenantId);
    await this.emitSectionEvent(
      HomepageEventNames.SECTION_DELETED,
      section,
      actorId,
    );
  }

  // ── Publish all ────────────────────────────────────────────────────────────

  /**
   * Publishes all draft sections for a page in one operation.
   * Called when an admin clicks "Publish page".
   */
  async publishAllDrafts(
    pageId:   string,
    tenantId: string,
    actorId:  string,
  ): Promise<number> {
    const drafts = await this.sectionRepo.findAllByPage(pageId, tenantId);
    const draftSections = drafts.filter((s) => s.status === 'draft');

    for (const section of draftSections) {
      await this.sectionRepo.updateById(
        section.id,
        { status: 'published', updatedBy: actorId } as unknown as Parameters<typeof this.sectionRepo.updateById>[1],
        tenantId,
      );
    }

    if (draftSections.length > 0) {
      await this.eventEmitter.emitAsync(HomepageEventNames.SECTIONS_REORDERED, {
        tenantId, pageId, actorId,
        count:     draftSections.length,
        timestamp: new Date().toISOString(),
      });
    }

    return draftSections.length;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates a raw payload against the appropriate Zod schema.
   * Returns the parsed (coerced and defaulted) payload on success.
   * Throws UnprocessableEntityException on failure.
   */
  private validatePayload(
    sectionType: SectionType,
    rawPayload:  unknown,
  ): Record<string, unknown> {
    const schema = SECTION_SCHEMAS[sectionType];
    const result = schema.safeParse(rawPayload);

    if (!result.success) {
      const issues = result.error.issues
        .map((i: { path: Array<string | number>; message: string }) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new UnprocessableEntityException(
        `Invalid payload for section type "${sectionType}": ${issues}`,
      );
    }

    return result.data as Record<string, unknown>;
  }

  private async emitSectionEvent(
    eventName: HomepageEventNames,
    section:   HomepageSectionEntity,
    actorId:   string,
  ): Promise<void> {
    const payload: HomepageSectionEventPayload = {
      tenantId:    section.tenantId,
      sectionId:   section.id,
      pageId:      section.pageId,
      sectionType: section.sectionType,
      actorId,
      timestamp:   new Date().toISOString(),
    };
    try {
      await this.eventEmitter.emitAsync(eventName, payload);
    } catch (err) {
      this.logger.error(`Failed to emit ${eventName}: ${String(err)}`);
    }
  }
}

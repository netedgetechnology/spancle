import { EventEmitter2 } from '@nestjs/event-emitter';
import { HomepageSectionRepository } from '../repositories/homepage-section.repository';
import type { CreateHomepageSectionDto, UpdateHomepageSectionDto, ReorderSectionsDto, CloneSectionDto } from '../dto/create-homepage-section.dto';
import { HomepageSectionEntity } from '../entities/homepage-section.entity';
export declare class HomepageService {
    private readonly sectionRepo;
    private readonly eventEmitter;
    private readonly logger;
    constructor(sectionRepo: HomepageSectionRepository, eventEmitter: EventEmitter2);
    createSection(dto: CreateHomepageSectionDto, tenantId: string, actorId: string): Promise<HomepageSectionEntity>;
    /**
     * Returns published, visible sections for public rendering.
     * No authentication required — called from public-website SSR.
     */
    getPublishedSections(pageId: string, tenantId: string): Promise<HomepageSectionEntity[]>;
    /**
     * Returns all sections (all statuses) for the admin editor.
     * Requires authenticated tenant admin.
     */
    getAllSections(pageId: string, tenantId: string): Promise<HomepageSectionEntity[]>;
    getSection(id: string, tenantId: string): Promise<HomepageSectionEntity>;
    updateSection(id: string, dto: UpdateHomepageSectionDto, tenantId: string, actorId: string): Promise<HomepageSectionEntity>;
    /**
     * Atomically reorders all sections for a page after a drag-and-drop.
     * Validates:
     *   - All section IDs belong to the same tenantId and pageId
     *   - No duplicate IDs in the payload
     */
    reorderSections(dto: ReorderSectionsDto, tenantId: string, actorId: string): Promise<HomepageSectionEntity[]>;
    /**
     * Clones a section — creates a new draft copy with a new adminLabel.
     * Useful for A/B testing variants of the same section.
     */
    cloneSection(id: string, dto: CloneSectionDto, tenantId: string, actorId: string): Promise<HomepageSectionEntity>;
    removeSection(id: string, tenantId: string, actorId: string): Promise<void>;
    /**
     * Publishes all draft sections for a page in one operation.
     * Called when an admin clicks "Publish page".
     */
    publishAllDrafts(pageId: string, tenantId: string, actorId: string): Promise<number>;
    /**
     * Validates a raw payload against the appropriate Zod schema.
     * Returns the parsed (coerced and defaulted) payload on success.
     * Throws UnprocessableEntityException on failure.
     */
    private validatePayload;
    private emitSectionEvent;
}
//# sourceMappingURL=homepage.service.d.ts.map
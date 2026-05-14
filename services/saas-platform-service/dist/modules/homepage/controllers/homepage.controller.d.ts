import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { HomepageService } from '../services/homepage.service';
import { CreateHomepageSectionDto, UpdateHomepageSectionDto, ReorderSectionsDto, CloneSectionDto } from '../dto/create-homepage-section.dto';
import type { HomepageSectionEntity } from '../entities/homepage-section.entity';
/**
 * HomepageController — section builder API.
 *
 * Public renderer endpoints:
 *   GET /api/v1/cms/homepage/pages/:pageId/sections/published
 *   → No auth required — called by public-website SSR
 *
 * Admin endpoints (require tenant auth via AppModule global guards):
 *   GET    /api/v1/cms/homepage/pages/:pageId/sections
 *   POST   /api/v1/cms/homepage/sections
 *   PATCH  /api/v1/cms/homepage/sections/:id
 *   DELETE /api/v1/cms/homepage/sections/:id
 *   POST   /api/v1/cms/homepage/sections/reorder
 *   POST   /api/v1/cms/homepage/sections/:id/clone
 *   POST   /api/v1/cms/homepage/pages/:pageId/publish-all
 */
export declare class HomepageController {
    private readonly homepageService;
    constructor(homepageService: HomepageService);
    /**
     * Returns published, visible sections for a page.
     * Consumed by public-website Next.js SSR via getStaticProps / fetch.
     * No JWT required — tenant resolved from x-tenant-id header.
     */
    getPublished(pageId: string, tenant: TenantContext): Promise<HomepageSectionEntity[]>;
    /**
     * Returns all sections (draft + published + archived) for the admin editor.
     */
    getAllForAdmin(pageId: string, tenant: TenantContext): Promise<HomepageSectionEntity[]>;
    getOne(id: string, tenant: TenantContext): Promise<HomepageSectionEntity>;
    create(dto: CreateHomepageSectionDto, tenant: TenantContext): Promise<HomepageSectionEntity>;
    update(id: string, dto: UpdateHomepageSectionDto, tenant: TenantContext): Promise<HomepageSectionEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
    /**
     * Reorders all sections after drag-and-drop in the admin UI.
     * Accepts the full new sorted list and updates all sortOrder values atomically.
     */
    reorder(dto: ReorderSectionsDto, tenant: TenantContext): Promise<HomepageSectionEntity[]>;
    /**
     * Clones a section — creates a draft copy with a new admin label.
     */
    clone(id: string, dto: CloneSectionDto, tenant: TenantContext): Promise<HomepageSectionEntity>;
    /**
     * Publishes all draft sections for a page in one operation.
     * Called when the admin clicks "Go Live" / "Publish page".
     */
    publishAll(pageId: string, tenant: TenantContext): Promise<{
        published: number;
    }>;
}
//# sourceMappingURL=homepage.controller.d.ts.map
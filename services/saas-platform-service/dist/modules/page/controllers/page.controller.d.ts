import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { PageService } from '../services/page.service';
import { CreatePageDto, UpdatePageDto } from '../dto/create-page.dto';
import type { PageEntity } from '../entities/page.entity';
/**
 * PageController — CMS page management endpoints.
 *
 * All routes require:
 *   - Valid tenant context (TenantGuard via AppModule global guards)
 *   - Authenticated session (JwtAuthGuard via AppModule global guards)
 *
 * Public page retrieval by slug uses @Public() — accessible by the
 * frontend renderer without authentication.
 */
export declare class PageController {
    private readonly pageService;
    constructor(pageService: PageService);
    create(dto: CreatePageDto, tenant: TenantContext): Promise<PageEntity>;
    findAll(tenant: TenantContext, page?: string, limit?: string, status?: string): Promise<{
        data: PageEntity[];
        total: number;
    }>;
    /**
     * GET /cms/pages/homepage
     * Returns the tenant's designated homepage page record.
     * Called by public-website resolvePageId for the root URL.
     * Returns 404 if no homepage page has been set for this tenant.
     */
    findHomepage(tenant: TenantContext): Promise<PageEntity>;
    findBySlug(slug: string, tenant: TenantContext): Promise<PageEntity>;
    findOne(id: string, tenant: TenantContext): Promise<PageEntity>;
    update(id: string, dto: UpdatePageDto, tenant: TenantContext): Promise<PageEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=page.controller.d.ts.map
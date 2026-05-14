import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { PageEntity, type PageStatus } from '../entities/page.entity';
export declare class PageRepository extends TenantAwareRepository<PageEntity> {
    constructor(dataSource: DataSource);
    findBySlug(slug: string, tenantId: string): Promise<PageEntity | null>;
    findPublished(tenantId: string, page?: number, limit?: number): Promise<{
        data: PageEntity[];
        total: number;
    }>;
    findByStatus(status: PageStatus, tenantId: string): Promise<PageEntity[]>;
    findHomepage(tenantId: string): Promise<PageEntity | null>;
    isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /** Clears isHomepage on all pages for the tenant before setting a new one */
    clearHomepage(tenantId: string): Promise<void>;
    findPaginated(tenantId: string, page?: number, limit?: number, alias?: string): Promise<{
        data: PageEntity[];
        total: number;
    }>;
}
//# sourceMappingURL=page.repository.d.ts.map
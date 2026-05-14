import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { HomepageSectionEntity } from '../entities/homepage-section.entity';
import type { SectionType } from '../types/section-payload.types';
export declare class HomepageSectionRepository extends TenantAwareRepository<HomepageSectionEntity> {
    constructor(dataSource: DataSource);
    /**
     * Returns all published, visible sections for a page in sortOrder.
     * Used by the public renderer.
     */
    findPublishedByPage(pageId: string, tenantId: string): Promise<HomepageSectionEntity[]>;
    /**
     * Returns ALL sections for a page (all statuses).
     * Used by the admin editor.
     */
    findAllByPage(pageId: string, tenantId: string): Promise<HomepageSectionEntity[]>;
    /**
     * Returns sections filtered by type — used to enforce section limits.
     */
    findByPageAndType(pageId: string, sectionType: SectionType, tenantId: string): Promise<HomepageSectionEntity[]>;
    /**
     * Returns a single section by id within a tenant.
     * Throws NotFoundException if not found or already deleted.
     */
    findByIdOrFail(id: string, tenantId: string): Promise<HomepageSectionEntity>;
    /**
     * Creates and saves a new section. tenantId must be set on data before calling.
     */
    insert(data: Partial<HomepageSectionEntity>, tenantId?: string): Promise<HomepageSectionEntity>;
    /**
     * Returns the current max sortOrder for a page.
     * Used to append a new section at the end.
     */
    getMaxSortOrder(pageId: string, tenantId: string): Promise<number>;
    /**
     * Bulk-updates sortOrder for reordering — uses a single transaction.
     * All section IDs must belong to tenantId (validated in service).
     */
    bulkUpdateSortOrder(updates: Array<{
        id: string;
        sortOrder: number;
    }>, tenantId: string): Promise<void>;
    /**
     * Updates a single section by id within a tenant.
     */
    updateById(id: string, data: Partial<HomepageSectionEntity>, tenantId: string): Promise<HomepageSectionEntity>;
    /**
     * Soft-deletes a single section by id within a tenant.
     */
    softDelete(id: string, tenantId: string): Promise<void>;
    /**
     * Soft-deletes all sections for a page — used when a page is deleted.
     */
    softDeleteAllByPage(pageId: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=homepage-section.repository.d.ts.map
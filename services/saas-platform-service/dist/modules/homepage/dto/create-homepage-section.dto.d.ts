import { SECTION_TYPES } from '../types/section-payload.types';
/**
 * CreateHomepageSectionDto
 *
 * The `payload` field is typed as `Record<string, unknown>` at the DTO layer.
 * Structural validation of the payload is performed in HomepageService
 * via SECTION_SCHEMAS[sectionType].parse(payload) before any DB write.
 */
export declare class CreateHomepageSectionDto {
    pageId: string;
    sectionType: typeof SECTION_TYPES[number];
    adminLabel: string;
    /**
     * Typed JSONB payload — shape is validated against the sectionType schema
     * inside HomepageService before persisting.
     */
    payload: Record<string, unknown>;
    sortOrder?: number;
    status?: 'draft' | 'published' | 'archived';
    isVisible?: boolean;
    abVariant?: string;
}
export declare class UpdateHomepageSectionDto {
    adminLabel?: string;
    /**
     * Partial payload update — merged with existing payload in service layer.
     * Full payload validation runs after merge.
     */
    payload?: Record<string, unknown>;
    sortOrder?: number;
    status?: 'draft' | 'published' | 'archived';
    isVisible?: boolean;
    abVariant?: string;
}
declare class SectionOrderItem {
    id: string;
    sortOrder: number;
}
/**
 * ReorderSectionsDto — sent after a drag-and-drop operation in the admin UI.
 * Contains the complete new ordered list for the page.
 * Service validates all IDs belong to the same tenantId before updating.
 */
export declare class ReorderSectionsDto {
    pageId: string;
    sections: SectionOrderItem[];
}
export declare class CloneSectionDto {
    adminLabel: string;
    targetPageId?: string;
}
export {};
//# sourceMappingURL=create-homepage-section.dto.d.ts.map
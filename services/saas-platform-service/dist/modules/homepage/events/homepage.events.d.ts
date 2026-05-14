import type { SectionType } from '../types/section-payload.types';
export declare enum HomepageEventNames {
    SECTION_CREATED = "spancle.cms.homepage.section.created",
    SECTION_UPDATED = "spancle.cms.homepage.section.updated",
    SECTION_PUBLISHED = "spancle.cms.homepage.section.published",
    SECTION_ARCHIVED = "spancle.cms.homepage.section.archived",
    SECTION_DELETED = "spancle.cms.homepage.section.deleted",
    SECTIONS_REORDERED = "spancle.cms.homepage.sections.reordered",
    SECTION_CLONED = "spancle.cms.homepage.section.cloned"
}
export interface HomepageSectionEventPayload {
    tenantId: string;
    sectionId: string;
    pageId: string;
    sectionType: SectionType;
    actorId: string;
    timestamp: string;
}
export interface SectionsReorderedEventPayload {
    tenantId: string;
    pageId: string;
    actorId: string;
    count: number;
    timestamp: string;
}
//# sourceMappingURL=homepage.events.d.ts.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HomepageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomepageService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const homepage_section_repository_1 = require("../repositories/homepage-section.repository");
const homepage_events_1 = require("../events/homepage.events");
const section_payload_types_1 = require("../types/section-payload.types");
const MAX_SECTIONS_PER_PAGE = 20;
const MAX_PER_TYPE = {
    hero_banner: 1,
    pricing_preview: 1,
};
let HomepageService = HomepageService_1 = class HomepageService {
    constructor(sectionRepo, eventEmitter) {
        this.sectionRepo = sectionRepo;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(HomepageService_1.name);
    }
    async createSection(dto, tenantId, actorId) {
        const validatedPayload = this.validatePayload(dto.sectionType, dto.payload);
        const total = await this.sectionRepo.count(tenantId);
        if (total >= MAX_SECTIONS_PER_PAGE) {
            throw new common_1.BadRequestException(`Maximum of ${MAX_SECTIONS_PER_PAGE} sections per page reached`);
        }
        const typeLimit = MAX_PER_TYPE[dto.sectionType];
        if (typeLimit !== undefined) {
            const existing = await this.sectionRepo.findByPageAndType(dto.pageId, dto.sectionType, tenantId);
            if (existing.length >= typeLimit) {
                throw new common_1.BadRequestException(`Only ${typeLimit} section(s) of type "${dto.sectionType}" allowed per page`);
            }
        }
        const maxOrder = await this.sectionRepo.getMaxSortOrder(dto.pageId, tenantId);
        const sortOrder = dto.sortOrder ?? maxOrder + 1;
        const section = await this.sectionRepo.insert({
            tenantId,
            pageId: dto.pageId,
            sectionType: dto.sectionType,
            adminLabel: dto.adminLabel,
            payload: validatedPayload,
            sortOrder,
            status: dto.status ?? 'draft',
            isVisible: dto.isVisible ?? true,
            abVariant: dto.abVariant ?? null,
            createdBy: actorId,
            updatedBy: actorId,
        }, tenantId);
        await this.emitSectionEvent(homepage_events_1.HomepageEventNames.SECTION_CREATED, section, actorId);
        this.logger.log(`Section created: ${section.id} type=${section.sectionType} page=${section.pageId} tenant=${tenantId}`);
        return section;
    }
    async getPublishedSections(pageId, tenantId) {
        return this.sectionRepo.findPublishedByPage(pageId, tenantId);
    }
    async getAllSections(pageId, tenantId) {
        return this.sectionRepo.findAllByPage(pageId, tenantId);
    }
    async getSection(id, tenantId) {
        return this.sectionRepo.findByIdOrFail(id, tenantId);
    }
    async updateSection(id, dto, tenantId, actorId) {
        const existing = await this.sectionRepo.findByIdOrFail(id, tenantId);
        let validatedPayload;
        if (dto.payload !== undefined) {
            const merged = { ...existing.payload, ...dto.payload };
            validatedPayload = this.validatePayload(existing.sectionType, merged);
        }
        const updated = await this.sectionRepo.updateById(id, {
            ...(dto.adminLabel !== undefined && { adminLabel: dto.adminLabel }),
            ...(validatedPayload !== undefined && { payload: validatedPayload }),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
            ...(dto.abVariant !== undefined && { abVariant: dto.abVariant }),
            updatedBy: actorId,
        }, tenantId);
        const eventName = dto.status === 'published'
            ? homepage_events_1.HomepageEventNames.SECTION_PUBLISHED
            : dto.status === 'archived'
                ? homepage_events_1.HomepageEventNames.SECTION_ARCHIVED
                : homepage_events_1.HomepageEventNames.SECTION_UPDATED;
        await this.emitSectionEvent(eventName, updated, actorId);
        return updated;
    }
    async reorderSections(dto, tenantId, actorId) {
        const ids = dto.sections.map((s) => s.id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            throw new common_1.BadRequestException('Duplicate section IDs in reorder request');
        }
        const existing = await this.sectionRepo.findAllByPage(dto.pageId, tenantId);
        const existingIds = new Set(existing.map((s) => s.id));
        for (const { id } of dto.sections) {
            if (!existingIds.has(id)) {
                throw new common_1.ForbiddenException(`Section ${id} does not belong to page ${dto.pageId} for this tenant`);
            }
        }
        await this.sectionRepo.bulkUpdateSortOrder(dto.sections, tenantId);
        const reorderedEvent = {
            tenantId,
            pageId: dto.pageId,
            actorId,
            count: dto.sections.length,
            timestamp: new Date().toISOString(),
        };
        await this.eventEmitter.emitAsync(homepage_events_1.HomepageEventNames.SECTIONS_REORDERED, reorderedEvent);
        return this.sectionRepo.findAllByPage(dto.pageId, tenantId);
    }
    async cloneSection(id, dto, tenantId, actorId) {
        const source = await this.sectionRepo.findByIdOrFail(id, tenantId);
        const maxOrder = await this.sectionRepo.getMaxSortOrder(dto.targetPageId ?? source.pageId, tenantId);
        const cloned = await this.sectionRepo.insert({
            tenantId,
            pageId: dto.targetPageId ?? source.pageId,
            sectionType: source.sectionType,
            adminLabel: dto.adminLabel,
            payload: { ...source.payload },
            sortOrder: maxOrder + 1,
            status: 'draft',
            isVisible: source.isVisible,
            abVariant: source.abVariant,
            createdBy: actorId,
            updatedBy: actorId,
        }, tenantId);
        await this.emitSectionEvent(homepage_events_1.HomepageEventNames.SECTION_CLONED, cloned, actorId);
        return cloned;
    }
    async removeSection(id, tenantId, actorId) {
        const section = await this.sectionRepo.findByIdOrFail(id, tenantId);
        await this.sectionRepo.softDelete(id, tenantId);
        await this.emitSectionEvent(homepage_events_1.HomepageEventNames.SECTION_DELETED, section, actorId);
    }
    async publishAllDrafts(pageId, tenantId, actorId) {
        const drafts = await this.sectionRepo.findAllByPage(pageId, tenantId);
        const draftSections = drafts.filter((s) => s.status === 'draft');
        for (const section of draftSections) {
            await this.sectionRepo.updateById(section.id, { status: 'published', updatedBy: actorId }, tenantId);
        }
        if (draftSections.length > 0) {
            await this.eventEmitter.emitAsync(homepage_events_1.HomepageEventNames.SECTIONS_REORDERED, {
                tenantId, pageId, actorId,
                count: draftSections.length,
                timestamp: new Date().toISOString(),
            });
        }
        return draftSections.length;
    }
    validatePayload(sectionType, rawPayload) {
        const schema = section_payload_types_1.SECTION_SCHEMAS[sectionType];
        const result = schema.safeParse(rawPayload);
        if (!result.success) {
            const issues = result.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ');
            throw new common_1.UnprocessableEntityException(`Invalid payload for section type "${sectionType}": ${issues}`);
        }
        return result.data;
    }
    async emitSectionEvent(eventName, section, actorId) {
        const payload = {
            tenantId: section.tenantId,
            sectionId: section.id,
            pageId: section.pageId,
            sectionType: section.sectionType,
            actorId,
            timestamp: new Date().toISOString(),
        };
        try {
            await this.eventEmitter.emitAsync(eventName, payload);
        }
        catch (err) {
            this.logger.error(`Failed to emit ${eventName}: ${String(err)}`);
        }
    }
};
exports.HomepageService = HomepageService;
exports.HomepageService = HomepageService = HomepageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [homepage_section_repository_1.HomepageSectionRepository,
        event_emitter_1.EventEmitter2])
], HomepageService);
//# sourceMappingURL=homepage.service.js.map
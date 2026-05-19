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
var PageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const page_repository_1 = require("../repositories/page.repository");
const page_events_1 = require("../events/page.events");
let PageService = PageService_1 = class PageService {
    constructor(pageRepository, eventEmitter) {
        this.pageRepository = pageRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(PageService_1.name);
    }
    async create(dto, tenantId, actorId) {
        const slugTaken = await this.pageRepository.isSlugTaken(dto.slug, tenantId);
        if (slugTaken) {
            throw new common_1.ConflictException(`A page with slug "${dto.slug}" already exists`);
        }
        if (dto.isHomepage) {
            await this.pageRepository.clearHomepage(tenantId);
        }
        const entity = await this.pageRepository.insert({
            ...dto,
            tenantId,
            authorId: actorId,
            lastEditedBy: actorId,
            publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
            status: dto.status ?? 'draft',
            seo: dto.seo ?? {},
        }, tenantId);
        await this.eventEmitter.emitAsync(page_events_1.PageEventNames.CREATED, {
            tenantId, pageId: entity.id, actorId, slug: entity.slug,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Page created: ${entity.id} slug="${entity.slug}" tenant=${tenantId}`);
        return entity;
    }
    async findAll(tenantId, page = 1, limit = 20, status) {
        if (status) {
            const data = await this.pageRepository.findByStatus(status, tenantId);
            return { data, total: data.length };
        }
        return this.pageRepository.findPaginated(tenantId, page, limit, 'p');
    }
    async findOne(id, tenantId) {
        return this.pageRepository.findByIdOrFail(id, tenantId);
    }
    async findHomepage(tenantId) {
        const page = await this.pageRepository.findHomepage(tenantId);
        if (!page)
            throw new common_1.NotFoundException('No homepage has been configured for this tenant');
        return page;
    }
    async findBySlug(slug, tenantId) {
        const page = await this.pageRepository.findBySlug(slug, tenantId);
        if (!page)
            throw new common_1.NotFoundException(`Page with slug "${slug}" not found`);
        return page;
    }
    async update(id, dto, tenantId, actorId) {
        await this.pageRepository.findByIdOrFail(id, tenantId);
        if (dto.slug) {
            const slugTaken = await this.pageRepository.isSlugTaken(dto.slug, tenantId, id);
            if (slugTaken) {
                throw new common_1.ConflictException(`A page with slug "${dto.slug}" already exists`);
            }
        }
        if (dto.isHomepage) {
            await this.pageRepository.clearHomepage(tenantId);
        }
        const updated = await this.pageRepository.updateById(id, {
            ...dto,
            lastEditedBy: actorId,
            publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        }, tenantId);
        const eventName = dto.status === 'published'
            ? page_events_1.PageEventNames.PUBLISHED
            : dto.status === 'archived'
                ? page_events_1.PageEventNames.ARCHIVED
                : page_events_1.PageEventNames.UPDATED;
        await this.eventEmitter.emitAsync(eventName, {
            tenantId, pageId: id, actorId, slug: updated.slug,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async remove(id, tenantId, actorId) {
        await this.pageRepository.findByIdOrFail(id, tenantId);
        await this.pageRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(page_events_1.PageEventNames.DELETED, {
            tenantId, pageId: id, actorId,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.PageService = PageService;
exports.PageService = PageService = PageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [page_repository_1.PageRepository,
        event_emitter_1.EventEmitter2])
], PageService);
//# sourceMappingURL=page.service.js.map
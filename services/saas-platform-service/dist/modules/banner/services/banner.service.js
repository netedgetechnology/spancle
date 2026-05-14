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
var BannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const banner_repository_1 = require("../repositories/banner.repository");
const banner_events_1 = require("../events/banner.events");
const seo_fields_embed_1 = require("../../seo/embeds/seo-fields.embed");
let BannerService = BannerService_1 = class BannerService {
    constructor(bannerRepository, eventEmitter) {
        this.bannerRepository = bannerRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(BannerService_1.name);
    }
    async create(dto, tenantId, actorId) {
        const entity = await this.bannerRepository.insert({
            ...dto,
            tenantId,
            activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null,
            activeTo: dto.activeTo ? new Date(dto.activeTo) : null,
            status: dto.status ?? 'draft',
            seo: dto.seo ? Object.assign(new seo_fields_embed_1.SeoFieldsEmbed(), dto.seo) : new seo_fields_embed_1.SeoFieldsEmbed(),
        }, tenantId);
        await this.eventEmitter.emitAsync(banner_events_1.BannerEventNames.CREATED, {
            tenantId, bannerId: entity.id, actorId, timestamp: new Date().toISOString(),
        });
        return entity;
    }
    async findAll(tenantId, placement, status) {
        if (placement)
            return this.bannerRepository.findByPlacement(placement, tenantId);
        if (status)
            return this.bannerRepository.findByStatus(status, tenantId);
        return this.bannerRepository.findAll(tenantId);
    }
    async findOne(id, tenantId) {
        return this.bannerRepository.findByIdOrFail(id, tenantId);
    }
    async findByKey(key, tenantId) {
        const banner = await this.bannerRepository.findByKey(key, tenantId);
        if (!banner)
            throw new common_1.NotFoundException(`Banner with key "${key}" not found`);
        return banner;
    }
    async update(id, dto, tenantId, actorId) {
        await this.bannerRepository.findByIdOrFail(id, tenantId);
        const updated = await this.bannerRepository.updateById(id, {
            ...dto,
            activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : undefined,
            activeTo: dto.activeTo ? new Date(dto.activeTo) : undefined,
        }, tenantId);
        const eventName = dto.status === 'active' ? banner_events_1.BannerEventNames.ACTIVATED : banner_events_1.BannerEventNames.UPDATED;
        await this.eventEmitter.emitAsync(eventName, {
            tenantId, bannerId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async remove(id, tenantId, actorId) {
        await this.bannerRepository.findByIdOrFail(id, tenantId);
        await this.bannerRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(banner_events_1.BannerEventNames.DELETED, {
            tenantId, bannerId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
};
exports.BannerService = BannerService;
exports.BannerService = BannerService = BannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [banner_repository_1.BannerRepository,
        event_emitter_1.EventEmitter2])
], BannerService);
//# sourceMappingURL=banner.service.js.map
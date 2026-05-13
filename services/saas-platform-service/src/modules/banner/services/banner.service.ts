import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BannerRepository } from '../repositories/banner.repository';
import type { CreateBannerDto, UpdateBannerDto } from '../dto/create-banner.dto';
import { BannerEntity, type BannerPlacement } from '../entities/banner.entity';
import { BannerEventNames } from '../events/banner.events';
import { SeoFieldsEmbed } from '../../seo/embeds/seo-fields.embed';

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);

  constructor(
    private readonly bannerRepository: BannerRepository,
    private readonly eventEmitter:     EventEmitter2,
  ) {}

  async create(dto: CreateBannerDto, tenantId: string, actorId: string): Promise<BannerEntity> {
    const entity = await this.bannerRepository.insert(
      {
        ...dto,
        tenantId,
        activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null,
        activeTo:   dto.activeTo   ? new Date(dto.activeTo)   : null,
        status:     dto.status ?? 'draft',
        seo: dto.seo ? Object.assign(new SeoFieldsEmbed(), dto.seo) : new SeoFieldsEmbed(),
      } as unknown as Parameters<typeof this.bannerRepository.insert>[0],
      tenantId,
    );

    await this.eventEmitter.emitAsync(BannerEventNames.CREATED, {
      tenantId, bannerId: entity.id, actorId, timestamp: new Date().toISOString(),
    });
    return entity;
  }

  async findAll(tenantId: string, placement?: string, status?: string): Promise<BannerEntity[]> {
    if (placement) return this.bannerRepository.findByPlacement(placement as BannerPlacement, tenantId);
    if (status) return this.bannerRepository.findByStatus(status as BannerEntity['status'], tenantId);
    return this.bannerRepository.findAll(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<BannerEntity> {
    return this.bannerRepository.findByIdOrFail(id, tenantId);
  }

  async findByKey(key: string, tenantId: string): Promise<BannerEntity> {
    const banner = await this.bannerRepository.findByKey(key, tenantId);
    if (!banner) throw new NotFoundException(`Banner with key "${key}" not found`);
    return banner;
  }

  async update(id: string, dto: UpdateBannerDto, tenantId: string, actorId: string): Promise<BannerEntity> {
    await this.bannerRepository.findByIdOrFail(id, tenantId);
    const updated = await this.bannerRepository.updateById(
      id,
      {
        ...dto,
        activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : undefined,
        activeTo:   dto.activeTo   ? new Date(dto.activeTo)   : undefined,
      } as unknown as Parameters<typeof this.bannerRepository.updateById>[1],
      tenantId,
    );

    const eventName = dto.status === 'active' ? BannerEventNames.ACTIVATED : BannerEventNames.UPDATED;
    await this.eventEmitter.emitAsync(eventName, {
      tenantId, bannerId: id, actorId, timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.bannerRepository.findByIdOrFail(id, tenantId);
    await this.bannerRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(BannerEventNames.DELETED, {
      tenantId, bannerId: id, actorId, timestamp: new Date().toISOString(),
    });
  }
}

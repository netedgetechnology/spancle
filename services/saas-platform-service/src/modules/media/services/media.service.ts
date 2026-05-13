import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MediaAssetRepository } from '../repositories/media-asset.repository';
import type { CreateMediaAssetDto, UpdateMediaAssetDto } from '../dto/create-media-asset.dto';
import { MediaAssetEntity, type MediaAssetType } from '../entities/media-asset.entity';
import { MediaEventNames } from '../events/media.events';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly mediaRepository: MediaAssetRepository,
    private readonly eventEmitter:    EventEmitter2,
    private readonly config:          ConfigService,
  ) {}

  /**
   * Registers a media asset after the file has been uploaded to storage.
   * The upload itself is handled by the controller (multipart) — this
   * service only persists the metadata record.
   */
  async register(dto: CreateMediaAssetDto, tenantId: string, actorId: string): Promise<MediaAssetEntity> {
    const driver = (this.config.get<string>('STORAGE_DRIVER') ?? 'local') as MediaAssetEntity['driver'];

    const entity = await this.mediaRepository.insert(
      {
        ...dto,
        tenantId,
        uploadedBy: actorId,
        driver:     dto.driver ?? driver,
        assetType:  dto.assetType ?? this.inferAssetType(dto.mimeType),
      } as unknown as Parameters<typeof this.mediaRepository.insert>[0],
      tenantId,
    );

    await this.eventEmitter.emitAsync(MediaEventNames.UPLOADED, {
      tenantId, assetId: entity.id, actorId,
      assetType: entity.assetType, timestamp: new Date().toISOString(),
    });

    return entity;
  }

  async findAll(tenantId: string, page = 1, limit = 20, assetType?: string): Promise<{ data: MediaAssetEntity[]; total: number }> {
    if (assetType) return this.mediaRepository.findByType(assetType as MediaAssetType, tenantId, page, limit);
    return this.mediaRepository.findPaginated(tenantId, page, limit, 'm');
  }

  async findOne(id: string, tenantId: string): Promise<MediaAssetEntity> {
    return this.mediaRepository.findByIdOrFail(id, tenantId);
  }

  async update(id: string, dto: UpdateMediaAssetDto, tenantId: string, actorId: string): Promise<MediaAssetEntity> {
    await this.mediaRepository.findByIdOrFail(id, tenantId);
    const updated = await this.mediaRepository.updateById(id, dto as unknown as Parameters<typeof this.mediaRepository.updateById>[1], tenantId);
    await this.eventEmitter.emitAsync(MediaEventNames.UPDATED, {
      tenantId, assetId: id, actorId, timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.mediaRepository.findByIdOrFail(id, tenantId);
    await this.mediaRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(MediaEventNames.DELETED, {
      tenantId, assetId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  async adjustReferenceCount(id: string, tenantId: string, delta: 1 | -1): Promise<void> {
    await this.mediaRepository.adjustReferenceCount(id, tenantId, delta);
  }

  private inferAssetType(mimeType: string): MediaAssetType {
    if (mimeType.startsWith('image/'))       return 'image';
    if (mimeType.startsWith('video/'))       return 'video';
    if (mimeType.startsWith('audio/'))       return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('spreadsheet')) return 'document';
    return 'other';
  }
}

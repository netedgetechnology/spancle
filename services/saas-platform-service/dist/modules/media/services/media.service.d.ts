import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MediaAssetRepository } from '../repositories/media-asset.repository';
import type { CreateMediaAssetDto, UpdateMediaAssetDto } from '../dto/create-media-asset.dto';
import { MediaAssetEntity } from '../entities/media-asset.entity';
export declare class MediaService {
    private readonly mediaRepository;
    private readonly eventEmitter;
    private readonly config;
    private readonly logger;
    constructor(mediaRepository: MediaAssetRepository, eventEmitter: EventEmitter2, config: ConfigService);
    /**
     * Registers a media asset after the file has been uploaded to storage.
     * The upload itself is handled by the controller (multipart) — this
     * service only persists the metadata record.
     */
    register(dto: CreateMediaAssetDto, tenantId: string, actorId: string): Promise<MediaAssetEntity>;
    findAll(tenantId: string, page?: number, limit?: number, assetType?: string): Promise<{
        data: MediaAssetEntity[];
        total: number;
    }>;
    findOne(id: string, tenantId: string): Promise<MediaAssetEntity>;
    update(id: string, dto: UpdateMediaAssetDto, tenantId: string, actorId: string): Promise<MediaAssetEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    adjustReferenceCount(id: string, tenantId: string, delta: 1 | -1): Promise<void>;
    private inferAssetType;
}
//# sourceMappingURL=media.service.d.ts.map
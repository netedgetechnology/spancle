import { EventEmitter2 } from '@nestjs/event-emitter';
import { PageRepository } from '../repositories/page.repository';
import type { CreatePageDto, UpdatePageDto } from '../dto/create-page.dto';
import { PageEntity } from '../entities/page.entity';
export declare class PageService {
    private readonly pageRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(pageRepository: PageRepository, eventEmitter: EventEmitter2);
    create(dto: CreatePageDto, tenantId: string, actorId: string): Promise<PageEntity>;
    findAll(tenantId: string, page?: number, limit?: number, status?: string): Promise<{
        data: PageEntity[];
        total: number;
    }>;
    findOne(id: string, tenantId: string): Promise<PageEntity>;
    findHomepage(tenantId: string): Promise<PageEntity>;
    findBySlug(slug: string, tenantId: string): Promise<PageEntity>;
    update(id: string, dto: UpdatePageDto, tenantId: string, actorId: string): Promise<PageEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
}
//# sourceMappingURL=page.service.d.ts.map
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PageRepository } from '../repositories/page.repository';
import type { CreatePageDto, UpdatePageDto } from '../dto/create-page.dto';
import { PageEntity } from '../entities/page.entity';
import { PageEventNames } from '../events/page.events';

@Injectable()
export class PageService {
  private readonly logger = new Logger(PageService.name);

  constructor(
    private readonly pageRepository: PageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreatePageDto,
    tenantId: string,
    actorId: string,
  ): Promise<PageEntity> {
    const slugTaken = await this.pageRepository.isSlugTaken(dto.slug, tenantId);
    if (slugTaken) {
      throw new ConflictException(`A page with slug "${dto.slug}" already exists`);
    }

    if (dto.isHomepage) {
      await this.pageRepository.clearHomepage(tenantId);
    }

    const entity = await this.pageRepository.insert(
      {
        ...dto,
        tenantId,
        authorId:       actorId,
        lastEditedBy:   actorId,
        publishedAt:    dto.publishedAt ? new Date(dto.publishedAt) : null,
        status:         dto.status ?? 'draft',
        seo:            dto.seo ?? {},
      } as unknown as Parameters<typeof this.pageRepository.insert>[0],
      tenantId,
    );

    await this.eventEmitter.emitAsync(PageEventNames.CREATED, {
      tenantId, pageId: entity.id, actorId, slug: entity.slug,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Page created: ${entity.id} slug="${entity.slug}" tenant=${tenantId}`);
    return entity;
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: PageEntity[]; total: number }> {
    if (status) {
      const data = await this.pageRepository.findByStatus(status as PageEntity['status'], tenantId);
      return { data, total: data.length };
    }
    return this.pageRepository.findPaginated(tenantId, page, limit, 'p');
  }

  async findOne(id: string, tenantId: string): Promise<PageEntity> {
    return this.pageRepository.findByIdOrFail(id, tenantId);
  }


  async findHomepage(tenantId: string): Promise<PageEntity> {
    const page = await this.pageRepository.findHomepage(tenantId);
    if (!page) throw new NotFoundException('No homepage has been configured for this tenant');
    return page;
  }

    async findBySlug(slug: string, tenantId: string): Promise<PageEntity> {
    const page = await this.pageRepository.findBySlug(slug, tenantId);
    if (!page) throw new NotFoundException(`Page with slug "${slug}" not found`);
    return page;
  }

  async update(
    id: string,
    dto: UpdatePageDto,
    tenantId: string,
    actorId: string,
  ): Promise<PageEntity> {
    await this.pageRepository.findByIdOrFail(id, tenantId);

    if (dto.slug) {
      const slugTaken = await this.pageRepository.isSlugTaken(dto.slug, tenantId, id);
      if (slugTaken) {
        throw new ConflictException(`A page with slug "${dto.slug}" already exists`);
      }
    }

    if (dto.isHomepage) {
      await this.pageRepository.clearHomepage(tenantId);
    }

    const updated = await this.pageRepository.updateById(
      id,
      {
        ...dto,
        lastEditedBy: actorId,
        publishedAt:  dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      } as unknown as Parameters<typeof this.pageRepository.updateById>[1],
      tenantId,
    );

    const eventName = dto.status === 'published'
      ? PageEventNames.PUBLISHED
      : dto.status === 'archived'
        ? PageEventNames.ARCHIVED
        : PageEventNames.UPDATED;

    await this.eventEmitter.emitAsync(eventName, {
      tenantId, pageId: id, actorId, slug: updated.slug,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.pageRepository.findByIdOrFail(id, tenantId);
    await this.pageRepository.softDelete(id, tenantId);

    await this.eventEmitter.emitAsync(PageEventNames.DELETED, {
      tenantId, pageId: id, actorId,
      timestamp: new Date().toISOString(),
    });
  }
}

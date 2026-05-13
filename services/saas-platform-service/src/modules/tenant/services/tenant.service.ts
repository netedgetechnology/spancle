import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantRepository } from '../repositories/tenant.repository';
import { TenantEvents } from '../events/tenant.events';
import type { CreateTenantDto } from '../dto/create-tenant.dto';
import type { UpdateTenantDto } from '../dto/update-tenant.dto';
import type { TenantEntity } from '../entities/tenant.entity';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTenantDto, tenantId: string): Promise<TenantEntity> {
    this.logger.log(`Creating tenant -- tenant: ${tenantId}`);
    const entity = await this.tenantRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(TenantEvents.CREATED, { tenantId, tenantId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<TenantEntity[]> {
    return this.tenantRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<TenantEntity> {
    const entity = await this.tenantRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Tenant not found');
    return entity;
  }

  async update(id: string, dto: UpdateTenantDto, tenantId: string): Promise<TenantEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.tenantRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(TenantEvents.UPDATED, { tenantId, tenantId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.tenantRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(TenantEvents.DELETED, { tenantId, tenantId: id });
  }
}

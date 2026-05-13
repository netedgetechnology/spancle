import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardEvents } from '../events/dashboard.events';
import type { CreateDashboardDto } from '../dto/create-dashboard.dto';
import type { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import type { DashboardEntity } from '../entities/dashboard.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateDashboardDto, tenantId: string): Promise<DashboardEntity> {
    this.logger.log(`Creating dashboard -- tenant: ${tenantId}`);
    const entity = await this.dashboardRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(DashboardEvents.CREATED, { tenantId, dashboardId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<DashboardEntity[]> {
    return this.dashboardRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<DashboardEntity> {
    const entity = await this.dashboardRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Dashboard not found');
    return entity;
  }

  async update(id: string, dto: UpdateDashboardDto, tenantId: string): Promise<DashboardEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.dashboardRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(DashboardEvents.UPDATED, { tenantId, dashboardId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.dashboardRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(DashboardEvents.DELETED, { tenantId, dashboardId: id });
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricRepository } from '../repositories/metric.repository';
import { MetricEvents } from '../events/metric.events';
import type { CreateMetricDto } from '../dto/create-metric.dto';
import type { UpdateMetricDto } from '../dto/update-metric.dto';
import type { MetricEntity } from '../entities/metric.entity';

@Injectable()
export class MetricService {
  private readonly logger = new Logger(MetricService.name);

  constructor(
    private readonly metricRepository: MetricRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateMetricDto, tenantId: string): Promise<MetricEntity> {
    this.logger.log(`Creating metric -- tenant: ${tenantId}`);
    const entity = await this.metricRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(MetricEvents.CREATED, { tenantId, metricId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<MetricEntity[]> {
    return this.metricRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<MetricEntity> {
    const entity = await this.metricRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Metric not found');
    return entity;
  }

  async update(id: string, dto: UpdateMetricDto, tenantId: string): Promise<MetricEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.metricRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(MetricEvents.UPDATED, { tenantId, metricId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.metricRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(MetricEvents.DELETED, { tenantId, metricId: id });
  }
}

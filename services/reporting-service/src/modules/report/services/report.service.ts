import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportRepository } from '../repositories/report.repository';
import { ReportEvents } from '../events/report.events';
import type { CreateReportDto } from '../dto/create-report.dto';
import type { UpdateReportDto } from '../dto/update-report.dto';
import type { ReportEntity } from '../entities/report.entity';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateReportDto, tenantId: string): Promise<ReportEntity> {
    this.logger.log(`Creating report -- tenant: ${tenantId}`);
    const entity = await this.reportRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(ReportEvents.CREATED, { tenantId, reportId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<ReportEntity[]> {
    return this.reportRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<ReportEntity> {
    const entity = await this.reportRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Report not found');
    return entity;
  }

  async update(id: string, dto: UpdateReportDto, tenantId: string): Promise<ReportEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.reportRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(ReportEvents.UPDATED, { tenantId, reportId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.reportRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(ReportEvents.DELETED, { tenantId, reportId: id });
  }
}

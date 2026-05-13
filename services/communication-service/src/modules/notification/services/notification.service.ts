import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationEvents } from '../events/notification.events';
import type { CreateNotificationDto } from '../dto/create-notification.dto';
import type { UpdateNotificationDto } from '../dto/update-notification.dto';
import type { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateNotificationDto, tenantId: string): Promise<NotificationEntity> {
    this.logger.log(`Creating notification -- tenant: ${tenantId}`);
    const entity = await this.notificationRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(NotificationEvents.CREATED, { tenantId, notificationId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<NotificationEntity[]> {
    return this.notificationRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<NotificationEntity> {
    const entity = await this.notificationRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Notification not found');
    return entity;
  }

  async update(id: string, dto: UpdateNotificationDto, tenantId: string): Promise<NotificationEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.notificationRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(NotificationEvents.UPDATED, { tenantId, notificationId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.notificationRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(NotificationEvents.DELETED, { tenantId, notificationId: id });
  }
}

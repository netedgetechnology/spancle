import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageRepository } from '../repositories/message.repository';
import { MessageEvents } from '../events/message.events';
import type { CreateMessageDto } from '../dto/create-message.dto';
import type { UpdateMessageDto } from '../dto/update-message.dto';
import type { MessageEntity } from '../entities/message.entity';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateMessageDto, tenantId: string): Promise<MessageEntity> {
    this.logger.log(`Creating message -- tenant: ${tenantId}`);
    const entity = await this.messageRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(MessageEvents.CREATED, { tenantId, messageId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<MessageEntity[]> {
    return this.messageRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<MessageEntity> {
    const entity = await this.messageRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Message not found');
    return entity;
  }

  async update(id: string, dto: UpdateMessageDto, tenantId: string): Promise<MessageEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.messageRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(MessageEvents.UPDATED, { tenantId, messageId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.messageRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(MessageEvents.DELETED, { tenantId, messageId: id });
  }
}

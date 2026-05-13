import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRepository } from '../repositories/user.repository';
import { UserEvents } from '../events/user.events';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto, tenantId: string): Promise<UserEntity> {
    this.logger.log(`Creating user -- tenant: ${tenantId}`);
    const entity = await this.userRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(UserEvents.CREATED, { tenantId, userId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<UserEntity[]> {
    return this.userRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<UserEntity> {
    const entity = await this.userRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('User not found');
    return entity;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string): Promise<UserEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.userRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(UserEvents.UPDATED, { tenantId, userId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.userRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(UserEvents.DELETED, { tenantId, userId: id });
  }
}

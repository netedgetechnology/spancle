import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoleRepository } from '../repositories/role.repository';
import { RoleEvents } from '../events/role.events';
import type { CreateRoleDto } from '../dto/create-role.dto';
import type { UpdateRoleDto } from '../dto/update-role.dto';
import type { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateRoleDto, tenantId: string): Promise<RoleEntity> {
    this.logger.log(`Creating role -- tenant: ${tenantId}`);
    const entity = await this.roleRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(RoleEvents.CREATED, { tenantId, roleId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<RoleEntity[]> {
    return this.roleRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<RoleEntity> {
    const entity = await this.roleRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Role not found');
    return entity;
  }

  async update(id: string, dto: UpdateRoleDto, tenantId: string): Promise<RoleEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.roleRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(RoleEvents.UPDATED, { tenantId, roleId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.roleRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(RoleEvents.DELETED, { tenantId, roleId: id });
  }
}

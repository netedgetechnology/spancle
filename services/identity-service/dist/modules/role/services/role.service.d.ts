import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoleRepository } from '../repositories/role.repository';
import type { CreateRoleDto } from '../dto/create-role.dto';
import type { UpdateRoleDto } from '../dto/update-role.dto';
import type { RoleEntity } from '../entities/role.entity';
export declare class RoleService {
    private readonly roleRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(roleRepository: RoleRepository, eventEmitter: EventEmitter2);
    create(dto: CreateRoleDto, tenantId: string): Promise<RoleEntity>;
    findAll(tenantId: string): Promise<RoleEntity[]>;
    findOne(id: string, tenantId: string): Promise<RoleEntity>;
    update(id: string, dto: UpdateRoleDto, tenantId: string): Promise<RoleEntity>;
    remove(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=role.service.d.ts.map
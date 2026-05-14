import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRepository } from '../repositories/user.repository';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UserEntity } from '../entities/user.entity';
export declare class UserService {
    private readonly userRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(userRepository: UserRepository, eventEmitter: EventEmitter2);
    create(dto: CreateUserDto, tenantId: string): Promise<UserEntity>;
    findAll(tenantId: string): Promise<UserEntity[]>;
    findOne(id: string, tenantId: string): Promise<UserEntity>;
    update(id: string, dto: UpdateUserDto, tenantId: string): Promise<UserEntity>;
    remove(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=user.service.d.ts.map
import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(dto: CreateUserDto, tenant: TenantContext): Promise<unknown>;
    findAll(tenant: TenantContext): Promise<unknown[]>;
    findOne(id: string, tenant: TenantContext): Promise<unknown>;
    update(id: string, dto: UpdateUserDto, tenant: TenantContext): Promise<unknown>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=user.controller.d.ts.map
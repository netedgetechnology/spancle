import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
export declare class RoleController {
    private readonly roleService;
    constructor(roleService: RoleService);
    create(dto: CreateRoleDto, tenant: TenantContext): Promise<unknown>;
    findAll(tenant: TenantContext): Promise<unknown[]>;
    findOne(id: string, tenant: TenantContext): Promise<unknown>;
    update(id: string, dto: UpdateRoleDto, tenant: TenantContext): Promise<unknown>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=role.controller.d.ts.map
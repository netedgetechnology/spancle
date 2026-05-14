import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    create(dto: CreateTenantDto, tenant: TenantContext): Promise<unknown>;
    findAll(tenant: TenantContext): Promise<unknown[]>;
    findOne(id: string, tenant: TenantContext): Promise<unknown>;
    update(id: string, dto: UpdateTenantDto, tenant: TenantContext): Promise<unknown>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=tenant.controller.d.ts.map
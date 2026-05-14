import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantRepository } from '../repositories/tenant.repository';
import type { CreateTenantDto } from '../dto/create-tenant.dto';
import type { UpdateTenantDto } from '../dto/update-tenant.dto';
import type { TenantEntity } from '../entities/tenant.entity';
export declare class TenantService {
    private readonly tenantRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(tenantRepository: TenantRepository, eventEmitter: EventEmitter2);
    create(dto: CreateTenantDto, tenantId: string): Promise<TenantEntity>;
    findAll(tenantId: string): Promise<TenantEntity[]>;
    findOne(id: string, tenantId: string): Promise<TenantEntity>;
    update(id: string, dto: UpdateTenantDto, tenantId: string): Promise<TenantEntity>;
    remove(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=tenant.service.d.ts.map
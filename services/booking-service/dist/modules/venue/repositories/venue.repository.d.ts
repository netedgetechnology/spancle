import type { Repository } from 'typeorm';
import { VenueEntity } from '../entities/venue.entity';
export declare class VenueRepository {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<VenueEntity>);
    create(data: Partial<VenueEntity>): Promise<VenueEntity>;
    findAllByTenant(tenantId: string): Promise<VenueEntity[]>;
    findByIdAndTenant(id: string, tenantId: string): Promise<VenueEntity | null>;
    update(id: string, tenantId: string, data: Partial<VenueEntity>): Promise<VenueEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=venue.repository.d.ts.map
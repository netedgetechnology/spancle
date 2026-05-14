import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { VenueService } from '../services/venue.service';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';
export declare class VenueController {
    private readonly venueService;
    constructor(venueService: VenueService);
    create(dto: CreateVenueDto, tenant: TenantContext): Promise<unknown>;
    findAll(tenant: TenantContext): Promise<unknown[]>;
    findOne(id: string, tenant: TenantContext): Promise<unknown>;
    update(id: string, dto: UpdateVenueDto, tenant: TenantContext): Promise<unknown>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=venue.controller.d.ts.map
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VenueRepository } from '../repositories/venue.repository';
import type { CreateVenueDto } from '../dto/create-venue.dto';
import type { UpdateVenueDto } from '../dto/update-venue.dto';
import type { VenueEntity } from '../entities/venue.entity';
export declare class VenueService {
    private readonly venueRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(venueRepository: VenueRepository, eventEmitter: EventEmitter2);
    create(dto: CreateVenueDto, tenantId: string): Promise<VenueEntity>;
    findAll(tenantId: string): Promise<VenueEntity[]>;
    findOne(id: string, tenantId: string): Promise<VenueEntity>;
    update(id: string, dto: UpdateVenueDto, tenantId: string): Promise<VenueEntity>;
    remove(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=venue.service.d.ts.map
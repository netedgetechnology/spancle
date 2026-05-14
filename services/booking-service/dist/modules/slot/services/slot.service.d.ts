import { EventEmitter2 } from '@nestjs/event-emitter';
import { SlotRepository } from '../repositories/slot.repository';
import type { SlotEntity, SlotStatus } from '../entities/slot.entity';
import type { CreateSlotDto } from '../dto/create-slot.dto';
import type { UpdateSlotDto } from '../dto/update-slot.dto';
import type { QuerySlotsDto } from '../dto/query-slots.dto';
export declare class SlotService {
    private readonly slotRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(slotRepository: SlotRepository, eventEmitter: EventEmitter2);
    create(dto: CreateSlotDto, tenantId: string, actorId: string): Promise<SlotEntity>;
    findAll(tenantId: string, query: QuerySlotsDto): Promise<SlotEntity[]>;
    findOne(id: string, tenantId: string): Promise<SlotEntity>;
    getStatusSummary(tenantId: string): Promise<Record<SlotStatus, number>>;
    update(id: string, dto: UpdateSlotDto, tenantId: string, actorId: string): Promise<SlotEntity>;
    updateStatus(id: string, status: SlotStatus, tenantId: string, actorId: string): Promise<SlotEntity>;
    /**
     * Reserves a slot for a checkout session. TTL: 15 minutes.
     * Calling BookingService then calls this before creating a booking.
     */
    reserve(id: string, tenantId: string, actorId: string): Promise<SlotEntity>;
    expireStaleReservations(tenantId: string): Promise<number>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    private assertTransitionAllowed;
}
//# sourceMappingURL=slot.service.d.ts.map
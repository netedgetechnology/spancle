import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { SlotService } from '../services/slot.service';
import { SlotGeneratorService } from '../services/slot-generator.service';
import { AvailabilityService } from '../services/availability.service';
import { CreateSlotDto } from '../dto/create-slot.dto';
import { UpdateSlotDto } from '../dto/update-slot.dto';
import { GenerateSlotsDto } from '../dto/generate-slots.dto';
import { QuerySlotsDto } from '../dto/query-slots.dto';
/**
 * SlotController — slot management + generation + availability endpoints.
 *
 * Routes:
 *   POST   /api/v1/slots               create one slot manually
 *   POST   /api/v1/slots/generate      bulk generate slots
 *   GET    /api/v1/slots               list/query slots
 *   GET    /api/v1/slots/status-summary
 *   GET    /api/v1/slots/:id
 *   PATCH  /api/v1/slots/:id           update metadata / price override
 *   PATCH  /api/v1/slots/:id/status    status transition
 *   PATCH  /api/v1/slots/:id/reserve   reserve a slot (checkout flow)
 *   DELETE /api/v1/slots/:id
 *   GET    /api/v1/slots/availability  available slots for a court/range
 */
export declare class SlotController {
    private readonly slotService;
    private readonly generatorService;
    private readonly availabilityService;
    constructor(slotService: SlotService, generatorService: SlotGeneratorService, availabilityService: AvailabilityService);
    create(dto: CreateSlotDto, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity>;
    generate(dto: GenerateSlotsDto, tenant: TenantContext): Promise<import("../services/slot-generator.service").GenerationResult>;
    findAll(query: QuerySlotsDto, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity[]>;
    getStatusSummary(tenant: TenantContext): Promise<Record<import("../entities/slot.entity").SlotStatus, number>>;
    getAvailability(query: QuerySlotsDto, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity[]>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity>;
    update(id: string, dto: UpdateSlotDto, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity>;
    updateStatus(id: string, status: string, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity>;
    reserve(id: string, tenant: TenantContext): Promise<import("../entities/slot.entity").SlotEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=slot.controller.d.ts.map
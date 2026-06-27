import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Roles, Public } from '../../../common/decorators/roles.decorator';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }      from '../guards/slot.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SlotService }         from '../services/slot.service';
import { SlotGeneratorService } from '../services/slot-generator.service';
import { AvailabilityService }  from '../services/availability.service';
import { CreateSlotDto }   from '../dto/create-slot.dto';
import { UpdateSlotDto }   from '../dto/update-slot.dto';
import { GenerateSlotsDto } from '../dto/generate-slots.dto';
import { QuerySlotsDto }           from '../dto/query-slots.dto';
import { AvailabilityQueryDto }    from '../dto/availability-query.dto';

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
@Controller('slots')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class SlotController {
  constructor(
    private readonly slotService:         SlotService,
    private readonly generatorService:    SlotGeneratorService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSlotDto, @TenantCtx() tenant: TenantContext) {
    return this.slotService.create(dto, tenant.tenantId, 'system');
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate(@Body() dto: GenerateSlotsDto, @TenantCtx() tenant: TenantContext) {
    return this.generatorService.generate(dto, tenant.tenantId, 'system');
  }

  @Get()
  findAll(@Query() query: QuerySlotsDto, @TenantCtx() tenant: TenantContext) {
    return this.slotService.findAll(tenant.tenantId, query);
  }

  @Get('status-summary')
  getStatusSummary(@TenantCtx() tenant: TenantContext) {
    return this.slotService.getStatusSummary(tenant.tenantId);
  }

  @Get('availability')
  getAvailability(
    @Query() query: AvailabilityQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.availabilityService.getAvailableSlots({
      tenantId:  tenant.tenantId,
      courtId:   query.courtId,
      branchId:  query.branchId,
      sportId:   query.sportId,
      from:      query.from ? new Date(query.from) : new Date(),
      to:        query.to   ? new Date(query.to)   : new Date(Date.now() + 7 * 86_400_000),
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.slotService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlotDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.slotService.update(id, dto, tenant.tenantId, 'system');
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.slotService.updateStatus(id, status as 'available' | 'unavailable' | 'cancelled', tenant.tenantId, 'system');
  }

  @Patch(':id/reserve')
  @HttpCode(HttpStatus.OK)
  reserve(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.slotService.reserve(id, tenant.tenantId, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.slotService.remove(id, tenant.tenantId, 'system');
  }
}

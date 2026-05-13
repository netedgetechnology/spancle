import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Roles, Public } from '../../../common/decorators/roles.decorator';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }       from '../../booking/guards/booking.guard';
import { AuditInterceptor }  from '../../../common/interceptors/audit.interceptor';
import { BlackoutRepository } from '../repositories/blackout.repository';
import { SlotRepository }     from '../repositories/slot.repository';
import { CreateBlackoutDto }  from '../dto/create-blackout.dto';
import type { BlackoutEntity } from '../entities/blackout.entity';

@Controller('blackouts')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class BlackoutController {
  constructor(
    private readonly blackoutRepository: BlackoutRepository,
    private readonly slotRepository:     SlotRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBlackoutDto, @TenantCtx() tenant: TenantContext) {
    const blackout = await this.blackoutRepository.create({
      ...dto,
      tenantId:   tenant.tenantId,
      scope:      dto.scope ?? 'tenant',
      allDay:     dto.allDay ?? false,
      cancelExistingSlots: dto.cancelExistingSlots ?? false,
      blockNewBookings:    dto.blockNewBookings    ?? true,
      isActive:   true,
      isDeleted:  false,
      startAt:    new Date(dto.startAt),
      endAt:      new Date(dto.endAt),
    } as Partial<BlackoutEntity>);

    // Cancel existing available slots if flag is set
    if (dto.cancelExistingSlots) {
      await this.slotRepository.bulkCancelAvailable({
        tenantId:  tenant.tenantId,
        startAt:   new Date(dto.startAt),
        endAt:     new Date(dto.endAt),
        courtId:   dto.courtId,
        branchId:  dto.branchId,
      });
    }

    return blackout;
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext) {
    return this.blackoutRepository.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.blackoutRepository.findByIdOrFail(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBlackoutDto>,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blackoutRepository.updateById(id, tenant.tenantId, dto as Partial<BlackoutEntity>);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.blackoutRepository.softDelete(id, tenant.tenantId);
  }
}

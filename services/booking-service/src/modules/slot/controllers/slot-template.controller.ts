import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Roles, Public } from '../../../common/decorators/roles.decorator';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }      from '../guards/slot.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SlotTemplateRepository } from '../repositories/slot-template.repository';
import { CreateSlotTemplateDto }  from '../dto/create-slot-template.dto';
import type { SlotTemplateEntity } from '../entities/slot-template.entity';

@Controller('slot-templates')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class SlotTemplateController {
  constructor(private readonly templateRepository: SlotTemplateRepository) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSlotTemplateDto, @TenantCtx() tenant: TenantContext) {
    return this.templateRepository.create({ ...dto, tenantId: tenant.tenantId, isActive: true, isDeleted: false });
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext) {
    return this.templateRepository.findAll(tenant.tenantId);
  }

  @Get('court/:courtId')
  findByCourt(@Param('courtId', ParseUUIDPipe) courtId: string, @TenantCtx() tenant: TenantContext) {
    return this.templateRepository.findByCourt(courtId, tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.templateRepository.findByIdOrFail(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateSlotTemplateDto>,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.templateRepository.updateById(id, tenant.tenantId, dto as Partial<SlotTemplateEntity>);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.templateRepository.softDelete(id, tenant.tenantId);
  }
}

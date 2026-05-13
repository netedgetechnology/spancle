import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../academy/guards/academy.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { AcademyService } from '../services/academy.service';
import { CreateAcademyDto } from '../dto/create-academy.dto';
import { UpdateAcademyDto } from '../dto/update-academy.dto';

@Controller('academys')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Post()
  create(@Body() dto: CreateAcademyDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.academyService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.academyService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.academyService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademyDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.academyService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.academyService.remove(id, tenant.tenantId);
  }
}

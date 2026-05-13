import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../coach/guards/coach.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { CoachService } from '../services/coach.service';
import { CreateCoachDto } from '../dto/create-coach.dto';
import { UpdateCoachDto } from '../dto/update-coach.dto';

@Controller('coachs')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Post()
  create(@Body() dto: CreateCoachDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.coachService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.coachService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.coachService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCoachDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.coachService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.coachService.remove(id, tenant.tenantId);
  }
}

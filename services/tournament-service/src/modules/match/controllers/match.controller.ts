import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../match/guards/match.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { MatchService } from '../services/match.service';
import { CreateMatchDto } from '../dto/create-match.dto';
import { UpdateMatchDto } from '../dto/update-match.dto';

@Controller('matchs')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  create(@Body() dto: CreateMatchDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.matchService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.matchService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.matchService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMatchDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.matchService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.matchService.remove(id, tenant.tenantId);
  }
}

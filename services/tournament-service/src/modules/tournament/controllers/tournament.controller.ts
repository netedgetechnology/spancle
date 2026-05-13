import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../tournament/guards/tournament.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TournamentService } from '../services/tournament.service';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';

@Controller('tournaments')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  create(@Body() dto: CreateTournamentDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.tournamentService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.tournamentService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.tournamentService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTournamentDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.tournamentService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.tournamentService.remove(id, tenant.tenantId);
  }
}

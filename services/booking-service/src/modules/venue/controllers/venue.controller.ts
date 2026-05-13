import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../venue/guards/venue.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { VenueService } from '../services/venue.service';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';

@Controller('venues')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Post()
  create(@Body() dto: CreateVenueDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.venueService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.venueService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.venueService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenueDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.venueService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.venueService.remove(id, tenant.tenantId);
  }
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors, Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { Public, Roles }  from '../../../common/decorators/roles.decorator';
import { TenantGuard }    from '../guards/venue.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { VenueService }   from '../services/venue.service';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';

@Controller('venues')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Post()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  create(@Body() dto: CreateVenueDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.venueService.create(dto, tenant.tenantId);
  }

  /**
   * GET /api/v1/venues
   *
   * Public — available to guests for venue discovery before booking.
   * Still requires x-tenant-id header (TenantGuard runs, RbacGuard bypassed).
   * Rate-limited: 60 requests per minute per IP (more permissive than default).
   */
  @Get()
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.venueService.findAll(tenant.tenantId);
  }

  /**
   * GET /api/v1/venues/:id
   * Public — venue detail for guest discovery.
   */
  @Get(':id')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.venueService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenueDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.venueService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.venueService.remove(id, tenant.tenantId);
  }
}

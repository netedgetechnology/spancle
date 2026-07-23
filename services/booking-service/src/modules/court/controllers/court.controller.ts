import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }       from '../../booking/guards/booking.guard';
import { AuditInterceptor }  from '../../../common/interceptors/audit.interceptor';
import { Public, Roles }    from '../../../common/decorators/roles.decorator';
import { CourtService }      from '../services/court.service';
import { CreateCourtDto }    from '../dto/create-court.dto';
import { UpdateCourtDto }    from '../dto/update-court.dto';

@Controller('courts')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  /** POST /api/v1/courts */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCourtDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.courtService.create(dto, tenant.tenantId);
  }

  /** GET /api/v1/courts — Public for guest discovery. Rate-limited 60/min. */
  @Get()
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.courtService.findAll(tenant.tenantId);
  }

  /** GET /api/v1/courts/:id — Public for guest discovery. */
  @Get(':id')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.courtService.findOne(id, tenant.tenantId);
  }

  /** PATCH /api/v1/courts/:id */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourtDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.courtService.update(id, dto, tenant.tenantId);
  }

  /** DELETE /api/v1/courts/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<void> {
    return this.courtService.remove(id, tenant.tenantId);
  }
}


/**
 * VenueCourtController — scoped court listing under a venue.
 * Mounted at /venues/:venueId/courts.
 */
@Controller('venues/:venueId/courts')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class VenueCourtController {
  constructor(private readonly courtService: CourtService) {}

  /** GET /api/v1/venues/:venueId/courts */
  @Get()
  findByVenue(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.courtService.findAllByVenue(venueId, tenant.tenantId);
  }
}

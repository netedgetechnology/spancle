import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }       from '../../booking/guards/booking.guard';
import { AuditInterceptor }  from '../../../common/interceptors/audit.interceptor';
import { AvailabilityService } from '../services/availability.service';
import { SlotUtils }           from '../utils/slot.utils';

class VenueCalendarQueryDto {
  from?: string;
  to?:   string;
}

/**
 * VenueSlotController — slot endpoints scoped to a venue.
 *
 * Mounted at /venues/:venueId/slots.
 *
 * Lives in SlotModule (not VenueModule) because it depends on
 * AvailabilityService which owns the slot query logic.
 */
@Controller('venues/:venueId/slots')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class VenueSlotController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /api/v1/venues/:venueId/slots
   *
   * Returns all slots for every court in the venue within the date range.
   * Caller groups by courtId for timeline display.
   *
   * Query params:
   *   from  ISO datetime — start of range (default: start of today)
   *   to    ISO datetime — end of range   (default: end of today)
   */
  @Get()
  getVenueCalendar(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: VenueCalendarQueryDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    const today = SlotUtils.todayUtc();
    const from  = query.from ? new Date(query.from) : new Date(`${today}T00:00:00.000Z`);
    const to    = query.to   ? new Date(query.to)   : new Date(`${today}T23:59:59.999Z`);

    return this.availabilityService.getVenueCalendar({
      tenantId: tenant.tenantId,
      venueId,
      from,
      to,
    });
  }
}

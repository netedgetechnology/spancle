import {
  Body, Controller, HttpCode, HttpStatus, Post, UseGuards,
} from '@nestjs/common';
import { Throttle }                   from '@nestjs/throttler';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }                from '../../../common/guards/tenant.guard';
import { Public }                     from '../../../common/decorators/roles.decorator';
import { ConsumerRegistrationService } from '../services/consumer-registration.service';
import { RegisterConsumerDto }        from '../dto/consumer.dto';

/**
 * ConsumerController
 *
 * Route prefix: /api/v1/consumer
 *
 * Self-service consumer (PLAYER) registration.
 * All routes are @Public() — bypass JwtAuthGuard. TenantGuard still
 * validates x-tenant-id header.
 *
 * Throttling: 5 registrations per minute per IP (identity-service already
 * applies global ThrottlerGuard at 100/min; this tightens it for registration).
 */
@Controller('consumer')
@UseGuards(TenantGuard)
export class ConsumerController {
  constructor(
    private readonly registrationService: ConsumerRegistrationService,
  ) {}

  /**
   * POST /api/v1/consumer/register
   *
   * Creates a new PLAYER account (UserEntity + IdentityEntity) and returns
   * a JWT token pair for immediate access.
   *
   * On success:
   *   - Emits `consumer.registered` event
   *   - booking-service listener links historical guest bookings by email
   *
   * Rate limit: 5/min per IP (tighter than global 100/min).
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() dto: RegisterConsumerDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.registrationService.register(dto, tenant.tenantId);
  }
}

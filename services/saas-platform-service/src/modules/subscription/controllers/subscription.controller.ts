import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor }   from '../../../common/interceptors/audit.interceptor';
import { TenantCtx }          from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { SuperAdminGuard }    from '../../admin/guards/super-admin.guard';
import { SubscriptionService } from '../services/subscription.service';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ActivateSubscriptionDto,
} from '../dto/create-subscription.dto';

/**
 * SubscriptionController
 *
 * Tenant routes (require valid tenant context):
 *   POST   /api/v1/subscriptions         → subscribe to a package
 *   GET    /api/v1/subscriptions/current → current subscription
 *   GET    /api/v1/subscriptions         → full history
 *   POST   /api/v1/subscriptions/:id/cancel
 *
 * Admin routes (SUPER_ADMIN only):
 *   POST   /api/v1/subscriptions/:id/activate
 *   POST   /api/v1/subscriptions/:id/pause
 *   POST   /api/v1/subscriptions/:id/resume
 *   POST   /api/v1/subscriptions/:id/expire
 */
@Controller('subscriptions')
@UseInterceptors(AuditInterceptor)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSubscriptionDto, @TenantCtx() tenant: TenantContext) {
    return this.subscriptionService.create(dto, tenant.tenantId, 'system');
  }

  @Get('current')
  getCurrent(@TenantCtx() tenant: TenantContext) {
    return this.subscriptionService.findActiveForTenant(tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext) {
    return this.subscriptionService.findAllForTenant(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionService.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancel(id, dto, 'system');
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateSubscriptionDto,
  ) {
    return this.subscriptionService.activate(id, dto, 'system');
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionService.pause(id, 'system');
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionService.resume(id, 'system');
  }

  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  expire(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionService.expire(id, 'system');
  }
}

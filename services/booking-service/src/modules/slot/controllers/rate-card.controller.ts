import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { RateCardService }       from '../services/rate-card.service';
import { CreateRateCardDto, UpdateRateCardDto } from '../dto/create-rate-card.dto';
import { TenantCtx }             from '../../../common/decorators/tenant.decorator';
import type { TenantContext }    from '../../../common/decorators/tenant.decorator';
import { Roles }                 from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }      from '../../../common/interceptors/audit.interceptor';

@Controller('rate-cards')
@UseInterceptors(AuditInterceptor)
export class RateCardController {
  constructor(private readonly rateCardService: RateCardService) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  create(
    @Body() dto: CreateRateCardDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    return this.rateCardService.create(dto, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }

  // ── List ───────────────────────────────────────────────────────────────────

  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('isActive') isActive?: string,
    @Query('page')     page    = '1',
    @Query('limit')    limit   = '25',
  ) {
    return this.rateCardService.findAll(tenant.tenantId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page:     parseInt(page,  10),
      limit:    parseInt(limit, 10),
    });
  }

  // ── Get one ────────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.rateCardService.findById(id, tenant.tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRateCardDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    return this.rateCardService.update(id, dto, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }

  // ── Activate / Deactivate ─────────────────────────────────────────────────

  @Patch(':id/activate')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    return this.rateCardService.activate(id, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }

  @Patch(':id/deactivate')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    return this.rateCardService.deactivate(id, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    return this.rateCardService.remove(id, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }
}

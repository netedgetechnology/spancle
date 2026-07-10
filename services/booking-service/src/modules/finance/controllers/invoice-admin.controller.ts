import {
  Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post,
  Query, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { InvoiceService }                          from '../services/invoice.service';
import { CreateInvoiceDto, FinaliseInvoiceDto, VoidInvoiceDto } from '../dto/invoice.dto';
import type { InvoiceStatus }                      from '../entities/invoice.entity';

/**
 * InvoiceAdminController — Finance Engine invoice administration endpoints.
 *
 * These routes are Finance-internal administration only:
 *   - Not exposed to end users directly
 *   - Nginx should restrict to trusted internal callers
 *   - All routes require TENANT_ADMIN or higher
 *
 * Payment, wallet, and refund operations will be added in Batch 7.2.
 */
@Controller('finance/admin/invoices')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class InvoiceAdminController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /** POST /api/v1/finance/admin/invoices — create invoice in draft state */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  draft(
    @Body() dto: CreateInvoiceDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.invoiceService.draft(dto, tenant.tenantId, actor.actorId);
  }

  /** GET /api/v1/finance/admin/invoices */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('status')     status?:     InvoiceStatus,
    @Query('customerId') customerId?: string,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit  = 50,
    @Query('offset', new DefaultValuePipe(0),  ParseIntPipe) offset = 0,
  ): Promise<unknown[]> {
    return this.invoiceService.findAll(tenant.tenantId, {
      status, customerId, limit, offset,
    });
  }

  /** GET /api/v1/finance/admin/invoices/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.invoiceService.findById(id, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/invoices/number/:invoiceNumber */
  @Get('number/:invoiceNumber')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByNumber(
    @Param('invoiceNumber') invoiceNumber: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.invoiceService.findByNumber(invoiceNumber, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/invoices/source/:sourceType/:sourceId */
  @Get('source/:sourceType/:sourceId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByReference(
    @Param('sourceType') sourceType: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.invoiceService.findByReference(sourceType, sourceId, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/invoices/:id/lines */
  @Get(':id/lines')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findLines(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.invoiceService.findLines(id, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/invoices/:id/taxes */
  @Get(':id/taxes')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findTaxes(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.invoiceService.findTaxes(id, tenant.tenantId);
  }

  /** PATCH /api/v1/finance/admin/invoices/:id/finalise */
  @Patch(':id/finalise')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  finalise(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinaliseInvoiceDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.invoiceService.finalise(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/invoices/:id/void */
  @Patch(':id/void')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidInvoiceDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.invoiceService.void(id, dto, tenant.tenantId, actor.actorId);
  }
}

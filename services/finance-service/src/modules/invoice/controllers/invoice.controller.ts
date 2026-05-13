import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantGuard }      from '../../invoice/guards/invoice.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { InvoiceService }   from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto, InvoiceQueryDto, RecordPaymentDto, VoidInvoiceDto } from '../dto/update-invoice.dto';

@Controller('invoices')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
@Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER', 'REPORT_VIEWER', 'RECEPTIONIST')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateInvoiceDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.create(dto, tenant.tenantId, 'system');
  }

  @Get()
  findAll(
    @Query() query: InvoiceQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.findAll(query, tenant.tenantId);
  }

  @Get('status-summary')
  getStatusSummary(@TenantCtx() tenant: TenantContext) {
    return this.invoiceService.getStatusSummary(tenant.tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.findOne(id, tenant.tenantId);
  }

  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.update(id, dto, tenant.tenantId, 'system');
  }

  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER')
  @Patch(':id/issue')
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.issue(id, tenant.tenantId, 'system');
  }

  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER', 'RECEPTIONIST')
  @Patch(':id/payment')
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.recordPayment(id, dto, tenant.tenantId, 'system');
  }

  @Roles('TENANT_ADMIN', 'CASHIER')
  @Patch(':id/void')
  voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidInvoiceDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.void(id, dto, tenant.tenantId, 'system');
  }

  @Roles('TENANT_ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.invoiceService.remove(id, tenant.tenantId, 'system');
  }
}

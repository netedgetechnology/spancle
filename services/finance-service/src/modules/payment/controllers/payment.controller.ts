import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantGuard }      from '../../payment/guards/payment.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { PaymentService }   from '../services/payment.service';
import {
  CreatePaymentDto,
  CapturePaymentDto,
  SettlePaymentDto,
  FailPaymentDto,
  CreateRefundDto,
  ReconcilePaymentDto,
  PaymentQueryDto,
} from '../dto/create-payment.dto';

@Controller('payments')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
@Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER', 'RECEPTIONIST', 'REPORT_VIEWER')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER', 'RECEPTIONIST')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePaymentDto, @TenantCtx() tenant: TenantContext) {
    return this.paymentService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@Query() query: PaymentQueryDto, @TenantCtx() tenant: TenantContext) {
    return this.paymentService.findAll(tenant.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.paymentService.findOne(id, tenant.tenantId);
  }

  /** Capture — marks authorised (e.g. card pre-auth confirmed) */
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER')
  @Patch(':id/capture')
  capture(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CapturePaymentDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.paymentService.capture(id, dto, tenant.tenantId);
  }

  /** Settle — funds confirmed in bank (cash, UPI after UTR, card after clearing) */
  @Roles('TENANT_ADMIN', 'CASHIER')
  @Patch(':id/settle')
  settle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettlePaymentDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.paymentService.settle(id, dto, tenant.tenantId);
  }

  /** Fail — gateway decline or timeout */
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER')
  @Patch(':id/fail')
  fail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FailPaymentDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.paymentService.fail(id, dto, tenant.tenantId);
  }

  /** Cancel — void before capture */
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER')
  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.paymentService.cancel(id, tenant.tenantId);
  }

  /** Refund — full or partial refund against a settled payment */
  @Roles('TENANT_ADMIN', 'CASHIER')
  @Post(':id/refund')
  @HttpCode(HttpStatus.CREATED)
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.paymentService.refund(id, dto, tenant.tenantId);
  }

  /** Reconcile — match against bank statement entry */
  @Roles('TENANT_ADMIN', 'CASHIER')
  @Patch(':id/reconcile')
  reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcilePaymentDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.paymentService.reconcile(id, dto, tenant.tenantId);
  }

  @Roles('TENANT_ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.paymentService.remove(id, tenant.tenantId);
  }
}

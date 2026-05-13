import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../wallet/guards/wallet.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { WalletService } from '../services/wallet.service';
import { CreateWalletDto } from '../dto/create-wallet.dto';
import { UpdateWalletDto } from '../dto/update-wallet.dto';

@Controller('wallets')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  create(@Body() dto: CreateWalletDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.walletService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.walletService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.walletService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWalletDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.walletService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.walletService.remove(id, tenant.tenantId);
  }
}

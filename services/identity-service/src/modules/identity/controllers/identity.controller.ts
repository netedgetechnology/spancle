import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../guards/identity.guard';
import { IdentityService } from '../services/identity.service';
import { LoginDto } from '../dto/create-identity.dto';
import { RefreshTokenDto } from '../dto/update-identity.dto';

@Controller('auth')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.identityService.login(dto, tenant.tenantId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.identityService.refreshToken(dto, tenant.tenantId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshTokenDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<void> {
    return this.identityService.logout(dto.refreshToken, tenant.tenantId);
  }
}

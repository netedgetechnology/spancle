import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../bracket/guards/bracket.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { BracketService } from '../services/bracket.service';
import { CreateBracketDto } from '../dto/create-bracket.dto';
import { UpdateBracketDto } from '../dto/update-bracket.dto';

@Controller('brackets')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class BracketController {
  constructor(private readonly bracketService: BracketService) {}

  @Post()
  create(@Body() dto: CreateBracketDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.bracketService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.bracketService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.bracketService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBracketDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.bracketService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.bracketService.remove(id, tenant.tenantId);
  }
}

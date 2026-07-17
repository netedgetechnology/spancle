import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SuperAdminGuard }        from '../../admin/guards/super-admin.guard';
import { AuditInterceptor }       from '../../../common/interceptors/audit.interceptor';
import { TenantCtx }              from '../../../common/decorators/tenant.decorator';
import type { TenantContext }     from '../../../common/decorators/tenant.decorator';
import { CommercialDecisionService } from '../services/commercial-decision.service';
import { CommercialDecisionRequestDto, CommercialDecisionResponseDto } from '../dto/commercial-decision.dto';
import { TransactionType }        from '../enums/commercial.enums';

/**
 * CommercialDecisionController — internal API for the Commercial Decision Framework.
 *
 * Routes:
 *   POST /api/v1/commercial/decisions        — evaluate a new decision
 *   GET  /api/v1/commercial/decisions/:id    — retrieve a past decision by snapshot ID
 *
 * All routes require:
 *   - JwtAuthGuard (global)
 *   - SuperAdminGuard (platform-level access)
 *
 * Tenant ID is extracted from the JWT or x-tenant-id header via TenantCtx.
 */
@Controller({ path: 'commercial/decisions', version: '1' })
@UseGuards(SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
export class CommercialDecisionController {
  constructor(private readonly decisionService: CommercialDecisionService) {}

  /**
   * POST /api/v1/commercial/decisions
   * Evaluate a commercial decision for the calling tenant.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async evaluate(
    @Body() dto: CommercialDecisionRequestDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<CommercialDecisionResponseDto> {
    if (!tenant.tenantId) {
      throw new BadRequestException('tenantId is required — ensure x-tenant-id header is set');
    }

    const result = await this.decisionService.evaluate({
      tenantId:        tenant.tenantId,
      moduleId:        dto.moduleId,
      productId:       dto.productId,
      transactionType: dto.transactionType,
      amountMinor:     dto.amountMinor,
      currency:        dto.currency,
      country:         dto.country,
      metadata:        dto.metadata ?? {},
      actorId:         null,
      requestedAt:     new Date(),
    });

    return CommercialDecisionResponseDto.from(result);
  }

  /**
   * GET /api/v1/commercial/decisions/:id
   * Retrieve a previously generated decision snapshot.
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<CommercialDecisionResponseDto> {
    const result = await this.decisionService.findDecision(id, tenant.tenantId);
    if (!result) throw new NotFoundException(`Decision ${id} not found`);
    return CommercialDecisionResponseDto.from(result);
  }
}

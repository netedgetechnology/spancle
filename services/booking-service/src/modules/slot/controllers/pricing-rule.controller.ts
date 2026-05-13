import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Roles, Public } from '../../../common/decorators/roles.decorator';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }      from '../guards/slot.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';

import { PricingRuleRepository }        from '../repositories/pricing-rule.repository';
import { PricingService }               from '../services/pricing.service';
import { PricingRuleValidationService } from '../services/pricing-rule-validation.service';

import { CreatePricingRuleDto } from '../dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from '../dto/update-pricing-rule.dto';
import { PricingPreviewDto }    from '../dto/pricing-preview.dto';
import type { PricingRuleEntity } from '../entities/pricing-rule.entity';

/**
 * PricingRuleController — full pricing rule lifecycle.
 *
 * All routes protected by TenantGuard (tenantId extracted from JWT) and
 * AuditInterceptor (request logged for compliance).
 *
 * Routes:
 *   POST   /api/v1/pricing-rules              create with validation
 *   GET    /api/v1/pricing-rules              list (all active; opt-in include inactive)
 *   GET    /api/v1/pricing-rules/preview      preview price for a hypothetical slot
 *   GET    /api/v1/pricing-rules/:id          single rule
 *   PATCH  /api/v1/pricing-rules/:id          update with validation
 *   PATCH  /api/v1/pricing-rules/:id/activate toggle isActive = true
 *   PATCH  /api/v1/pricing-rules/:id/deactivate toggle isActive = false
 *   DELETE /api/v1/pricing-rules/:id          soft delete
 *
 * Design decisions:
 *
 *   - All mutations go through PricingRuleValidationService before
 *     touching the DB. Validation throws on hard errors (400/422) and
 *     returns warnings in the response body for soft conflicts.
 *
 *   - Events are emitted after every successful mutation so the reporting
 *     service can track rule changes and their effect on revenue.
 *
 *   - Preview is a GET with a query-string body (PricingPreviewDto) rather
 *     than POST because it has no side effects and should be cacheable.
 *     In practice the admin UI sends it on every form change.
 */
@Controller('pricing-rules')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class PricingRuleController {
  constructor(
    private readonly pricingRuleRepository:  PricingRuleRepository,
    private readonly pricingService:         PricingService,
    private readonly validationService:      PricingRuleValidationService,
    private readonly eventEmitter:           EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  /**
   * POST /pricing-rules
   *
   * Creates a new pricing rule after running full validation:
   *   1. Semantic check  — ruleType + modifierType compatibility
   *   2. Value ranges    — percentage bounds, time ordering, date ordering
   *   3. Scope FK check  — branchId/sportId/courtId present when required
   *   4. Conflict scan   — no overlapping BASE or ABSOLUTE rules for same scope
   *
   * Returns: { rule, warnings } — warnings are non-fatal conflict advisories.
   */
  @Post()
  @Roles('TENANT_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePricingRuleDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    const candidate = this.dtoToEntity(dto, tenant.tenantId);

    // Run validation — throws BadRequestException / UnprocessableEntityException on errors
    const report = await this.validationService.validate(candidate, tenant.tenantId);

    const rule = await this.pricingRuleRepository.create(candidate);

    await this.eventEmitter.emitAsync('spancle.pricing_rule.created', {
      tenantId:  tenant.tenantId,
      ruleId:    rule.id,
      ruleType:  rule.ruleType,
      scope:     rule.scope,
      timestamp: new Date().toISOString(),
    });

    return { rule, warnings: report.warnings };
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.pricingRuleRepository.findAll(
      tenant.tenantId,
      includeInactive === 'true',
    );
  }

  /**
   * GET /pricing-rules/preview
   *
   * Resolves the effective price for a hypothetical slot using the current
   * active rule set. No DB writes. Returns full breakdown and summary string.
   *
   * Declared before /:id to avoid route shadowing.
   */
  @Get('preview')
  getPreview(
    @Query() dto: PricingPreviewDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.pricingService.preview(dto, tenant.tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  /**
   * PATCH /pricing-rules/:id
   *
   * Partial update. Validates the merged candidate (existing + patch) against
   * the full rule set before persisting.
   * Returns: { rule, warnings }
   */
  @Patch(':id')
  @Roles('TENANT_ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePricingRuleDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    // Fetch existing so we can merge before validation
    const existing = await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);

    // Merge patch onto existing for a complete validation candidate
    const merged: Partial<PricingRuleEntity> = {
      ...existing,
      ...this.updateDtoToPartialEntity(dto),
    };

    // Validate merged state — pass excludeId to skip self-conflict
    const report = await this.validationService.validate(merged, tenant.tenantId, id);

    const rule = await this.pricingRuleRepository.updateById(
      id,
      tenant.tenantId,
      this.updateDtoToPartialEntity(dto),
    );

    await this.eventEmitter.emitAsync('spancle.pricing_rule.updated', {
      tenantId:  tenant.tenantId,
      ruleId:    id,
      ruleType:  rule.ruleType,
      timestamp: new Date().toISOString(),
    });

    return { rule, warnings: report.warnings };
  }

  /**
   * PATCH /pricing-rules/:id/activate
   * Activates a previously deactivated rule. Re-validates against active rules
   * because the rule set has changed since it was deactivated.
   */
  @Patch(':id/activate')
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    const existing = await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);

    // Re-validate now that this rule is rejoining the active set
    const report = await this.validationService.validate(
      { ...existing, isActive: true },
      tenant.tenantId,
      id,
    );

    const rule = await this.pricingRuleRepository.updateById(
      id,
      tenant.tenantId,
      { isActive: true },
    );

    await this.eventEmitter.emitAsync('spancle.pricing_rule.activated', {
      tenantId: tenant.tenantId, ruleId: id, timestamp: new Date().toISOString(),
    });

    return { rule, warnings: report.warnings };
  }

  /**
   * PATCH /pricing-rules/:id/deactivate
   * Deactivates a rule without deleting it. The rule stops being applied
   * immediately (next generation / preview call will not find it).
   */
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);

    const rule = await this.pricingRuleRepository.updateById(
      id,
      tenant.tenantId,
      { isActive: false },
    );

    await this.eventEmitter.emitAsync('spancle.pricing_rule.deactivated', {
      tenantId: tenant.tenantId, ruleId: id, timestamp: new Date().toISOString(),
    });

    return rule;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * DELETE /pricing-rules/:id
   * Soft deletes (sets isDeleted = true, isActive = false).
   * The rule is excluded from all future resolution queries.
   * Audit trail is preserved — the row remains in the DB.
   */
  @Delete(':id')
  @Roles('TENANT_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
    await this.pricingRuleRepository.softDelete(id, tenant.tenantId);

    await this.eventEmitter.emitAsync('spancle.pricing_rule.deleted', {
      tenantId: tenant.tenantId, ruleId: id, timestamp: new Date().toISOString(),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Maps CreatePricingRuleDto → Partial<PricingRuleEntity> with defaults.
   * Explicit about every field so new DTO fields are never silently dropped.
   */
  private dtoToEntity(
    dto:      CreatePricingRuleDto,
    tenantId: string,
  ): Partial<PricingRuleEntity> {
    return {
      tenantId,
      name:          dto.name,
      description:   dto.description  ?? null,
      ruleType:      dto.ruleType,
      modifierType:  dto.modifierType ?? 'percentage',
      modifierValue: dto.modifierValue,
      scope:         dto.scope        ?? 'tenant',
      branchId:      dto.branchId     ?? null,
      sportId:       dto.sportId      ?? null,
      courtId:       dto.courtId      ?? null,
      validFrom:     dto.validFrom    ?? null,
      validUntil:    dto.validUntil   ?? null,
      daysOfWeek:    dto.daysOfWeek   ?? null,
      timeStart:     dto.timeStart    ?? null,
      timeEnd:       dto.timeEnd      ?? null,
      priority:      dto.priority     ?? 0,
      isActive:      true,
      isDeleted:     false,
    };
  }

  /**
   * Maps UpdatePricingRuleDto → Partial<PricingRuleEntity>.
   * Only includes keys that were explicitly present in the DTO (undefined = omitted).
   */
  private updateDtoToPartialEntity(
    dto: UpdatePricingRuleDto,
  ): Partial<PricingRuleEntity> {
    const patch: Partial<PricingRuleEntity> = {};

    if (dto.name          !== undefined) patch.name          = dto.name;
    if (dto.description   !== undefined) patch.description   = dto.description ?? null;
    if (dto.ruleType      !== undefined) patch.ruleType      = dto.ruleType;
    if (dto.modifierType  !== undefined) patch.modifierType  = dto.modifierType;
    if (dto.modifierValue !== undefined) patch.modifierValue = dto.modifierValue;
    if (dto.scope         !== undefined) patch.scope         = dto.scope;
    if (dto.branchId      !== undefined) patch.branchId      = dto.branchId ?? null;
    if (dto.sportId       !== undefined) patch.sportId       = dto.sportId  ?? null;
    if (dto.courtId       !== undefined) patch.courtId       = dto.courtId  ?? null;
    if (dto.validFrom     !== undefined) patch.validFrom     = dto.validFrom ?? null;
    if (dto.validUntil    !== undefined) patch.validUntil    = dto.validUntil ?? null;
    if (dto.daysOfWeek    !== undefined) patch.daysOfWeek    = dto.daysOfWeek ?? null;
    if (dto.timeStart     !== undefined) patch.timeStart     = dto.timeStart ?? null;
    if (dto.timeEnd       !== undefined) patch.timeEnd       = dto.timeEnd   ?? null;
    if (dto.priority      !== undefined) patch.priority      = dto.priority;
    if (dto.isActive      !== undefined) patch.isActive      = dto.isActive;

    return patch;
  }
}

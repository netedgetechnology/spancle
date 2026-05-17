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
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SuperAdminGuard }  from '../../admin/guards/super-admin.guard';
import { Public }           from '../../../common/decorators/roles.decorator';
import { PackageService }   from '../services/package.service';
import { CreatePackageDto, UpdatePackageDto } from '../dto/create-package.dto';
import type { PackageEntity } from '../entities/package.entity';

/**
 * PackageController — SaaS package definition management.
 *
 * Route groups:
 *   Public (no guard):
 *     GET  /api/v1/packages/active          → Active packages for pricing page
 *     GET  /api/v1/packages/by-slug/:slug   → Single package by slug
 *
 *   Admin (SuperAdminGuard):
 *     POST   /api/v1/packages               → Create
 *     GET    /api/v1/packages               → List all (incl. draft/archived)
 *     GET    /api/v1/packages/:id           → Single by ID
 *     PATCH  /api/v1/packages/:id           → Update
 *     DELETE /api/v1/packages/:id           → Soft delete
 *     POST   /api/v1/packages/:id/publish   → draft → active
 *     POST   /api/v1/packages/:id/deprecate → active → deprecated
 *     POST   /api/v1/packages/:id/archive   → deprecated → archived
 *     POST   /api/v1/packages/:id/clone     → Clone to new draft
 *     POST   /api/v1/packages/seed          → Seed 5 default tier packages
 */
@Controller('packages')
@UseInterceptors(AuditInterceptor)
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  /**
   * Returns active packages — used by public pricing page.
   * No authentication required.
   */
  @Get('active')
  @Public()
  getActive(): Promise<PackageEntity[]> {
    return this.packageService.findActive();
  }

  @Get('by-slug/:slug')
  @Public()
  getBySlug(@Param('slug') slug: string): Promise<PackageEntity> {
    return this.packageService.findBySlug(slug);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SuperAdminGuard)
  create(@Body() dto: CreatePackageDto): Promise<PackageEntity> {
    return this.packageService.create(dto, 'system');
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  findAll(
    @Query('includeArchived') includeArchived?: string,
  ): Promise<PackageEntity[]> {
    return this.packageService.findAll(includeArchived === 'true');
  }

  @Get(':id')
  @UseGuards(SuperAdminGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PackageEntity> {
    return this.packageService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ): Promise<PackageEntity> {
    return this.packageService.update(id, dto, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SuperAdminGuard)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.packageService.remove(id, 'system');
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  publish(@Param('id', ParseUUIDPipe) id: string): Promise<PackageEntity> {
    return this.packageService.publish(id, 'system');
  }

  @Post(':id/deprecate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  deprecate(@Param('id', ParseUUIDPipe) id: string): Promise<PackageEntity> {
    return this.packageService.deprecate(id, 'system');
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<PackageEntity> {
    return this.packageService.archive(id, 'system');
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SuperAdminGuard)
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { slug: string },
  ): Promise<PackageEntity> {
    return this.packageService.clone(id, body.slug, 'system');
  }

  // ── Seed ───────────────────────────────────────────────────────────────────

  /**
   * Seeds the 5 default tier packages from DEFAULT_PLAN_LIMITS.
   * Idempotent — existing tiers are skipped.
   */
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  seed(): Promise<{ created: number; skipped: number }> {
    return this.packageService.seedDefaults('system');
  }
}

import { PackageService } from '../services/package.service';
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
export declare class PackageController {
    private readonly packageService;
    constructor(packageService: PackageService);
    /**
     * Returns active packages — used by public pricing page.
     * No authentication required.
     */
    getActive(): Promise<PackageEntity[]>;
    getBySlug(slug: string): Promise<PackageEntity>;
    create(dto: CreatePackageDto): Promise<PackageEntity>;
    findAll(includeArchived?: string): Promise<PackageEntity[]>;
    findOne(id: string): Promise<PackageEntity>;
    update(id: string, dto: UpdatePackageDto): Promise<PackageEntity>;
    remove(id: string): Promise<void>;
    publish(id: string): Promise<PackageEntity>;
    deprecate(id: string): Promise<PackageEntity>;
    archive(id: string): Promise<PackageEntity>;
    clone(id: string, body: {
        slug: string;
    }): Promise<PackageEntity>;
    /**
     * Seeds the 5 default tier packages from DEFAULT_PLAN_LIMITS.
     * Idempotent — existing tiers are skipped.
     */
    seed(): Promise<{
        created: number;
        skipped: number;
    }>;
}
//# sourceMappingURL=package.controller.d.ts.map
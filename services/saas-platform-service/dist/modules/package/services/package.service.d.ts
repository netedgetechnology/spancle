import { EventEmitter2 } from '@nestjs/event-emitter';
import { PackageRepository } from '../repositories/package.repository';
import type { CreatePackageDto, UpdatePackageDto } from '../dto/create-package.dto';
import { PackageEntity } from '../entities/package.entity';
export declare class PackageService {
    private readonly packageRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(packageRepository: PackageRepository, eventEmitter: EventEmitter2);
    create(dto: CreatePackageDto, actorId: string): Promise<PackageEntity>;
    findAll(includeArchived?: boolean): Promise<PackageEntity[]>;
    /** Public endpoint — returns only active packages for the pricing page */
    findActive(): Promise<PackageEntity[]>;
    findOne(id: string): Promise<PackageEntity>;
    findBySlug(slug: string): Promise<PackageEntity>;
    update(id: string, dto: UpdatePackageDto, actorId: string): Promise<PackageEntity>;
    publish(id: string, actorId: string): Promise<PackageEntity>;
    deprecate(id: string, actorId: string): Promise<PackageEntity>;
    archive(id: string, actorId: string): Promise<PackageEntity>;
    /**
     * Seeds the 5 default tier packages from DEFAULT_PLAN_LIMITS.
     * Safe to call multiple times — skips tiers that already have a package.
     * Returns the count of newly created packages.
     */
    seedDefaults(actorId: string): Promise<{
        created: number;
        skipped: number;
    }>;
    /**
     * Clones an existing package — creates a draft copy.
     * Useful for creating custom variations of a standard tier.
     */
    clone(id: string, newSlug: string, actorId: string): Promise<PackageEntity>;
    remove(id: string, actorId: string): Promise<void>;
    private transitionStatus;
}
//# sourceMappingURL=package.service.d.ts.map
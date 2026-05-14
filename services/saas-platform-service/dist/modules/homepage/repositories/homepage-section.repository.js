"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomepageSectionRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const homepage_section_entity_1 = require("../entities/homepage-section.entity");
let HomepageSectionRepository = class HomepageSectionRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(homepage_section_entity_1.HomepageSectionEntity, dataSource.manager);
    }
    /**
     * Returns all published, visible sections for a page in sortOrder.
     * Used by the public renderer.
     */
    async findPublishedByPage(pageId, tenantId) {
        return this.scopedQb('hs', tenantId)
            .andWhere('hs.pageId    = :pageId', { pageId })
            .andWhere('hs.status    = :status', { status: 'published' })
            .andWhere('hs.isVisible = :isVisible', { isVisible: true })
            .orderBy('hs.sortOrder', 'ASC')
            .getMany();
    }
    /**
     * Returns ALL sections for a page (all statuses).
     * Used by the admin editor.
     */
    async findAllByPage(pageId, tenantId) {
        return this.scopedQb('hs', tenantId)
            .andWhere('hs.pageId = :pageId', { pageId })
            .orderBy('hs.sortOrder', 'ASC')
            .getMany();
    }
    /**
     * Returns sections filtered by type — used to enforce section limits.
     */
    async findByPageAndType(pageId, sectionType, tenantId) {
        return this.scopedQb('hs', tenantId)
            .andWhere('hs.pageId      = :pageId', { pageId })
            .andWhere('hs.sectionType = :sectionType', { sectionType })
            .orderBy('hs.sortOrder', 'ASC')
            .getMany();
    }
    /**
     * Returns a single section by id within a tenant.
     * Throws NotFoundException if not found or already deleted.
     */
    async findByIdOrFail(id, tenantId) {
        const section = await this.scopedQb('hs', tenantId)
            .andWhere('hs.id = :id', { id })
            .getOne();
        if (!section) {
            throw new common_1.NotFoundException(`HomepageSection ${id} not found`);
        }
        return section;
    }
    /**
     * Creates and saves a new section. tenantId must be set on data before calling.
     */
    async insert(data, tenantId) {
        const entity = this.entityManager.create(homepage_section_entity_1.HomepageSectionEntity, { ...data, ...(tenantId ? { tenantId } : {}) });
        return this.entityManager.save(homepage_section_entity_1.HomepageSectionEntity, entity);
    }
    /**
     * Returns the current max sortOrder for a page.
     * Used to append a new section at the end.
     */
    async getMaxSortOrder(pageId, tenantId) {
        const result = await this.scopedQb('hs', tenantId)
            .andWhere('hs.pageId = :pageId', { pageId })
            .select('MAX(hs.sortOrder)', 'maxOrder')
            .getRawOne();
        return result?.maxOrder !== null ? Number(result?.maxOrder) : -1;
    }
    /**
     * Bulk-updates sortOrder for reordering — uses a single transaction.
     * All section IDs must belong to tenantId (validated in service).
     */
    async bulkUpdateSortOrder(updates, tenantId) {
        await this.entityManager.transaction(async (em) => {
            for (const { id, sortOrder } of updates) {
                await em
                    .createQueryBuilder()
                    .update(homepage_section_entity_1.HomepageSectionEntity)
                    .set({ sortOrder, updatedAt: new Date() })
                    .where('id = :id AND tenantId = :tenantId AND isDeleted = false', {
                    id,
                    tenantId,
                })
                    .execute();
            }
        });
    }
    /**
     * Updates a single section by id within a tenant.
     */
    async updateById(id, data, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(homepage_section_entity_1.HomepageSectionEntity)
            .set({ ...data, updatedAt: new Date() })
            .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
            .execute();
        const updated = await this.scopedQb('hs', tenantId)
            .andWhere('hs.id = :id', { id })
            .getOne();
        if (!updated) {
            const { NotFoundException } = await Promise.resolve().then(() => __importStar(require('@nestjs/common')));
            throw new NotFoundException(`HomepageSection ${id} not found`);
        }
        return updated;
    }
    /**
     * Soft-deletes a single section by id within a tenant.
     */
    async softDelete(id, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(homepage_section_entity_1.HomepageSectionEntity)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
            .execute();
    }
    /**
     * Soft-deletes all sections for a page — used when a page is deleted.
     */
    async softDeleteAllByPage(pageId, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(homepage_section_entity_1.HomepageSectionEntity)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where('pageId = :pageId AND tenantId = :tenantId AND isDeleted = false', { pageId, tenantId })
            .execute();
    }
};
exports.HomepageSectionRepository = HomepageSectionRepository;
exports.HomepageSectionRepository = HomepageSectionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], HomepageSectionRepository);
//# sourceMappingURL=homepage-section.repository.js.map
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                      from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder }   from 'typeorm';
import { MembershipPlanEntity }                  from '../entities/membership-plan.entity';
import { MembershipBenefitEntity }               from '../entities/membership-benefit.entity';

@Injectable()
export class MembershipPlanRepository {
  private readonly logger = new Logger(MembershipPlanRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo()    { return this.dataSource.getRepository(MembershipPlanEntity); }
  private get benefitRepo() { return this.dataSource.getRepository(MembershipBenefitEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<MembershipPlanEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  async create(data: Partial<MembershipPlanEntity>): Promise<MembershipPlanEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAll(tenantId: string, activeOnly = false): Promise<MembershipPlanEntity[]> {
    const qb = this.scopedQb('p', tenantId).orderBy('p.sortOrder', 'ASC');
    if (activeOnly) qb.andWhere('p.isActive = true');
    return qb.getMany();
  }

  async findById(id: string, tenantId: string): Promise<MembershipPlanEntity | null> {
    return this.scopedQb('p', tenantId).andWhere('p.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<MembershipPlanEntity> {
    const plan = await this.findById(id, tenantId);
    if (!plan) throw new NotFoundException(`Membership plan ${id} not found`);
    return plan;
  }

  async findBySlug(slug: string, tenantId: string): Promise<MembershipPlanEntity | null> {
    return this.scopedQb('p', tenantId)
      .andWhere('p.slug = :slug', { slug })
      .getOne();
  }

  async update(
    id:       string,
    tenantId: string,
    data:     Partial<MembershipPlanEntity>,
  ): Promise<MembershipPlanEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, isActive: false, deletedAt: new Date() },
    );
  }

  // ── Benefits ──────────────────────────────────────────────────────────────

  async findBenefits(planId: string, tenantId: string): Promise<MembershipBenefitEntity[]> {
    return this.benefitRepo.find({
      where: { planId, tenantId, isDeleted: false },
      order: { sortOrder: 'ASC' },
    });
  }

  async createBenefit(
    data: Partial<MembershipBenefitEntity>,
  ): Promise<MembershipBenefitEntity> {
    return this.benefitRepo.save(this.benefitRepo.create(data));
  }

  async deleteBenefit(id: string, tenantId: string): Promise<void> {
    await this.benefitRepo.update({ id, tenantId }, { isDeleted: true });
  }
}

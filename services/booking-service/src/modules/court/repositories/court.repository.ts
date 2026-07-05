import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository }  from 'typeorm';
import { CourtEntity }      from '../entities/court.entity';

@Injectable()
export class CourtRepository {
  private readonly logger = new Logger(CourtRepository.name);

  constructor(
    @InjectRepository(CourtEntity)
    private readonly repo: Repository<CourtEntity>,
  ) {}

  async create(data: Partial<CourtEntity>): Promise<CourtEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<CourtEntity[]> {
    return this.repo.find({
      where:  { tenantId, isDeleted: false },
      order:  { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findAllByVenue(venueId: string, tenantId: string): Promise<CourtEntity[]> {
    return this.repo.find({
      where:  { venueId, tenantId, isDeleted: false },
      order:  { displayOrder: 'ASC', courtNumber: 'ASC' },
    });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CourtEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(
    id:       string,
    tenantId: string,
    data:     Partial<CourtEntity>,
  ): Promise<CourtEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, deletedAt: new Date() },
    );
  }

  /**
   * Checks whether a court name is already taken within the venue (excludes the given id).
   * Used by the service layer to enforce the UNIQUE(tenantId, venueId, name) constraint
   * with a clear application-level error before the DB raises a constraint violation.
   */
  async isNameTaken(
    name:     string,
    venueId:  string,
    tenantId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.repo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId',  { tenantId  })
      .andWhere('c.venueId = :venueId', { venueId   })
      .andWhere('LOWER(c.name) = LOWER(:name)', { name })
      .andWhere('c.isDeleted = false');

    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  /**
   * Checks whether a court number is already taken within the venue (excludes the given id).
   */
  async isCourtNumberTaken(
    courtNumber: number,
    venueId:     string,
    tenantId:    string,
    excludeId?:  string,
  ): Promise<boolean> {
    const qb = this.repo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId',          { tenantId    })
      .andWhere('c.venueId = :venueId',          { venueId     })
      .andWhere('c.courtNumber = :courtNumber',  { courtNumber })
      .andWhere('c.isDeleted = false');

    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }
}

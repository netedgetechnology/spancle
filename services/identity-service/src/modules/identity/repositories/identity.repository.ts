import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { IdentityEntity } from '../entities/identity.entity';

@Injectable()
export class IdentityRepository {
  private readonly logger = new Logger(IdentityRepository.name);

  constructor(
    @InjectRepository(IdentityEntity)
    private readonly repo: Repository<IdentityEntity>,
  ) {}

  /**
   * All queries MUST filter by tenantId — no cross-tenant reads permitted.
   */

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<IdentityEntity | null> {
    // passwordHash selected explicitly — normally excluded via select: false
    return this.repo
      .createQueryBuilder('identity')
      .addSelect('identity.passwordHash')
      .where('identity.email = :email', { email })
      .andWhere('identity.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<IdentityEntity | null> {
    return this.repo
      .createQueryBuilder('identity')
      .addSelect('identity.passwordHash')
      .where('identity.id = :id', { id })
      .andWhere('identity.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  async create(entity: Partial<IdentityEntity>): Promise<IdentityEntity> {
    const record = this.repo.create(entity);
    return this.repo.save(record);
  }

  /**
   * Records a successful login — resets failure counters, updates lastLoginAt.
   */
  async updateLoginSuccess(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      {
        lastLoginAt:         new Date(),
        failedLoginAttempts: 0,
        lockedUntil:         null,
      },
    );
  }

  /**
   * Records a failed login attempt — increments counter, optionally sets lock.
   */
  async updateLoginFailure(
    id:           string,
    tenantId:     string,
    attemptCount: number,
    lockedUntil:  Date | null,
  ): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { failedLoginAttempts: attemptCount, lockedUntil },
    );
  }

  /**
   * Updates the password hash and sets passwordChangedAt timestamp.
   */
  async updatePassword(
    id:       string,
    tenantId: string,
    newHash:  string,
  ): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      {
        passwordHash:      newHash,
        passwordChangedAt: new Date(),
      },
    );
  }

  /**
   * Resolves the system role for an identity by joining identities → users.
   *
   * Conditions enforced:
   *   - identity.id      = identityId
   *   - identity.tenant_id = tenantId
   *   - identity.is_active = true
   *   - user exists and is not deleted
   *
   * Returns null if no matching active identity/user found — caller defaults to 'VIEWER'.
   */
  async getRoleForIdentity(
    identityId: string,
    tenantId:   string,
  ): Promise<string | null> {
    const row = await this.repo
      .createQueryBuilder('i')
      .select('u.role', 'role')
      .innerJoin(
        'users',
        'u',
        'u.id = i.user_id AND u.tenant_id = i.tenant_id AND u.is_deleted = false',
      )
      .where('i.id = :identityId',   { identityId })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .getRawOne<{ role: string | null }>();

    return row?.role ?? null;
  }

  async updateLastLogin(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { lastLoginAt: new Date() });
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isActive: false });
  }
}

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
   * Resolves the system role for an identity by joining to the user and role tables.
   * Returns null if no role is assigned — caller defaults to 'VIEWER'.
   *
   * TODO: Join to user → role in Sprint 2 when UserModule is wired.
   */
  async getRoleForIdentity(
    identityId: string,
    _tenantId:  string,
  ): Promise<string | null> {
    // Placeholder — returns null until UserModule role join is implemented
    this.logger.debug(`getRoleForIdentity called for ${identityId} — returning null (Sprint 2)`);
    return null;
  }

  async updateLastLogin(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { lastLoginAt: new Date() });
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isActive: false });
  }
}

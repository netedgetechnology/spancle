import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRepository }     from '../../user/repositories/user.repository';
import { IdentityRepository } from '../../identity/repositories/identity.repository';
import { TokenService }       from '../../auth/services/token.service';
import { PasswordService }    from '../../auth/services/password.service';
import type { RegisterConsumerDto } from '../dto/consumer.dto';

/**
 * ConsumerRegistrationService
 *
 * Handles consumer (PLAYER) self-registration.
 *
 * Reuses:
 *   - UserRepository.create()           — existing user creation
 *   - IdentityRepository.create()       — existing identity creation
 *   - PasswordService.hash()            — existing bcrypt hashing
 *   - TokenService.issueTokenPair()     — existing JWT issuance
 *
 * No new entity types. No guest identity. No schema changes.
 *
 * Guest booking linking:
 *   After successful email verification (Phase 5 of the ADR),
 *   the booking-service is responsible for linking historical guest bookings
 *   where customerEmail matches and userId IS NULL. This is done via a
 *   dedicated booking-service endpoint that is called post-registration.
 *   The identity-service emits UserEvents.REGISTERED so the booking-service
 *   can listen and link bookings asynchronously.
 */
@Injectable()
export class ConsumerRegistrationService {
  private readonly logger = new Logger(ConsumerRegistrationService.name);

  constructor(
    private readonly dataSource:          DataSource,
    private readonly userRepository:      UserRepository,
    private readonly identityRepository:  IdentityRepository,
    private readonly passwordService:     PasswordService,
    private readonly tokenService:        TokenService,
    private readonly eventEmitter:        EventEmitter2,
  ) {}

  /**
   * register()
   *
   * Creates a UserEntity (role=PLAYER) and IdentityEntity in a single
   * transaction, then issues a JWT token pair for immediate login.
   *
   * Throws ConflictException if email is already registered for the tenant.
   */
  async register(dto: RegisterConsumerDto, tenantId: string): Promise<{
    userId:       string;
    accessToken:  string;
    refreshToken: string;
  }> {
    // Check for existing identity with this email
    const existing = await this.identityRepository.findByEmailAndTenant(
      dto.email.toLowerCase().trim(),
      tenantId,
    );
    if (existing) {
      // Constant-time path — same message regardless of account state
      throw new ConflictException('An account with this email already exists');
    }

    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    // Atomic: create user + identity in one transaction
    const { user, identity } = await this.dataSource.transaction(async (manager) => {
      const userRepo     = manager.getRepository((await import('../../user/entities/user.entity')).UserEntity);
      const identityRepo = manager.getRepository((await import('../../identity/entities/identity.entity')).IdentityEntity);

      const userEntity = await userRepo.save(userRepo.create({
        tenantId,
        name:  dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        role:  'PLAYER',
      }));

      const identityEntity = await identityRepo.save(identityRepo.create({
        tenantId,
        userId:        userEntity.id,
        email:         dto.email.toLowerCase().trim(),
        passwordHash,
        isActive:      true,
        isEmailVerified: false,   // email verification required for full access
      }));

      return { user: userEntity, identity: identityEntity };
    });

    // Issue JWT token pair — consumer can use the app immediately
    // Email verification gate is enforced at the application layer, not auth
    const tokenPair = await this.tokenService.issueTokenPair({
      identityId: identity.id,
      userId:     user.id,
      tenantId,
      role:       'PLAYER',
    });

    // Emit registration event — booking-service listens to link guest bookings
    await this.eventEmitter.emitAsync('consumer.registered', {
      tenantId,
      userId:        user.id,
      customerEmail: dto.email.toLowerCase().trim(),
      timestamp:     new Date().toISOString(),
    });

    this.logger.log(`Consumer registered — tenant=${tenantId} userId=${user.id}`);

    return {
      userId:       user.id,
      accessToken:  tokenPair.tokens.accessToken,
      refreshToken: tokenPair.tokens.refreshToken,
    };
  }
}

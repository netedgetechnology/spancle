import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { IdentityRepository } from '../repositories/identity.repository';
import type { LoginDto } from '../dto/create-identity.dto';
import type { RefreshTokenDto } from '../dto/update-identity.dto';
import { IdentityEvents } from '../events/identity.events';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async login(dto: LoginDto, tenantId: string): Promise<TokenPair> {
    this.logger.log(`Login attempt — tenant: ${tenantId}, email: ${dto.email}`);

    const identity = await this.identityRepository.findByEmailAndTenant(dto.email, tenantId);

    if (!identity) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // TODO: bcrypt.compare(dto.password, identity.passwordHash)

    const tokens = this.generateTokenPair(identity.id, tenantId, identity.userId);

    await this.eventEmitter.emitAsync(
      IdentityEvents.LOGIN_SUCCESS,
      { tenantId, identityId: identity.id, userId: identity.userId },
    );

    return tokens;
  }

  async refreshToken(dto: RefreshTokenDto, tenantId: string): Promise<TokenPair> {
    // TODO: Validate refresh token against Redis store, rotate token
    this.logger.log(`Token refresh — tenant: ${tenantId}`);
    throw new UnauthorizedException('Not implemented');
  }

  async logout(refreshToken: string, tenantId: string): Promise<void> {
    this.logger.log(`Logout — tenant: ${tenantId}`);
    // TODO: Revoke refresh token in Redis
    await this.eventEmitter.emitAsync(IdentityEvents.LOGOUT, { tenantId, refreshToken });
  }

  private generateTokenPair(identityId: string, tenantId: string, userId: string): TokenPair {
    const payload = { sub: identityId, tenantId, userId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken, expiresIn: 900 };
  }
}

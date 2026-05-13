import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController }   from './controllers/auth.controller';
import { AuthService }      from './services/auth.service';
import { TokenService }     from './services/token.service';
import { PasswordService }  from './services/password.service';
import { AuthRepository }   from './repositories/auth.repository';
import { JwtStrategy }      from './strategies/jwt.strategy';

import { IdentityEntity }     from '../identity/entities/identity.entity';
import { IdentityRepository } from '../identity/repositories/identity.repository';

/**
 * AuthModule — the authentication and authorisation foundation.
 *
 * Exports:
 *   - JwtModule       → for signing tokens in other modules
 *   - TokenService    → for programmatic token management
 *   - PasswordService → for identity creation in UserModule
 *   - AuthRepository  → for JwtStrategy access to blacklist
 *
 * Guards (JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard) are
 * registered as global guards in AppModule — not here.
 * This keeps AuthModule focused on auth logic, not cross-cutting guards.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:       config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          issuer:    config.get<string>('JWT_ISSUER', 'spancle-sports-os'),
          algorithm: 'HS256',
        },
      }),
    }),

    TypeOrmModule.forFeature([IdentityEntity]),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    TokenService,
    PasswordService,
    AuthRepository,
    JwtStrategy,
    IdentityRepository,
  ],

  exports: [
    AuthService,
    TokenService,
    PasswordService,
    AuthRepository,
    JwtModule,
  ],
})
export class AuthModule {}

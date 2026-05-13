import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentityController } from './controllers/identity.controller';
import { IdentityService } from './services/identity.service';
import { IdentityRepository } from './repositories/identity.repository';
import { IdentityEntity } from './entities/identity.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '15m'),
          issuer: config.get<string>('JWT_ISSUER', 'spancle-sports-os'),
        },
      }),
    }),
    TypeOrmModule.forFeature([IdentityEntity]),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, IdentityRepository],
  exports: [IdentityService, JwtModule],
})
export class IdentityModule {}

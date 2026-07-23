import { Module }   from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity }      from '../user/entities/user.entity';
import { IdentityEntity }  from '../identity/entities/identity.entity';
import { UserRepository }  from '../user/repositories/user.repository';
import { IdentityRepository } from '../identity/repositories/identity.repository';
import { AuthModule }      from '../auth/auth.module';
import { ConsumerController }         from './controllers/consumer.controller';
import { ConsumerRegistrationService } from './services/consumer-registration.service';

/**
 * ConsumerModule — consumer (PLAYER) self-registration.
 *
 * Imports:
 *   AuthModule — provides TokenService, PasswordService (via exports)
 *
 * Reuses existing repositories and services — no new entities.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, IdentityEntity]),
    AuthModule,
  ],
  controllers: [ConsumerController],
  providers: [
    UserRepository,
    IdentityRepository,
    ConsumerRegistrationService,
  ],
  exports: [ConsumerRegistrationService],
})
export class ConsumerModule {}

import { Module }        from '@nestjs/common';
import { HttpModule }    from '@nestjs/axios';

import { TenantModule }   from '../tenant/tenant.module';
import { UserModule }     from '../user/user.module';
import { AuthModule }     from '../auth/auth.module';
import { IdentityModule } from '../identity/identity.module';

import { OnboardingController }    from './controllers/onboarding.controller';
import { OnboardingService }       from './services/onboarding.service';
import { OnboardingTokenService }  from './services/onboarding-token.service';

/**
 * OnboardingModule — tenant onboarding workflow.
 *
 * Registers the 6-step onboarding saga as @Public() endpoints.
 * Depends on: TenantModule, UserModule, AuthModule, IdentityModule.
 *
 * HttpModule: used for cross-service calls to saas-platform-service
 * (package validation, subscription creation).
 */
@Module({
  imports: [
    HttpModule.register({
      timeout:     5_000,
      maxRedirects: 0,
    }),
    TenantModule,
    UserModule,
    AuthModule,
    IdentityModule,
  ],
  controllers: [OnboardingController],
  providers:   [OnboardingService, OnboardingTokenService],
})
export class OnboardingModule {}

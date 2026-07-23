import { Module, Global } from '@nestjs/common';
import { ConfigModule }  from '@nestjs/config';
import { NodemailerProvider } from './providers/nodemailer.provider';
import { EMAIL_PROVIDER }     from './interfaces/email-provider.interface';

/**
 * EmailModule
 *
 * @Global() — EMAIL_PROVIDER is injectable service-wide without
 * re-importing EmailModule. Import once in AppModule.
 *
 * Provider selection:
 *   Currently wires NodemailerProvider as the sole EMAIL_PROVIDER.
 *   To switch to SES / SendGrid / Resend:
 *     1. Implement EmailProvider abstract class.
 *     2. Change useClass below.
 *     3. No other file changes required.
 *
 * Exports:
 *   EMAIL_PROVIDER token — inject with @Inject(EMAIL_PROVIDER) in any service.
 *   NodemailerProvider — for direct injection if concrete type is needed.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    NodemailerProvider,
    {
      provide:  EMAIL_PROVIDER,
      useClass: NodemailerProvider,
    },
  ],
  exports: [EMAIL_PROVIDER, NodemailerProvider],
})
export class EmailModule {}

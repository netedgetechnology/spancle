import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validateAndLoadConfig, type BaseConfig } from './base.config';

/**
 * SpancleConfigModule — global NestJS configuration module.
 *
 * Drop-in replacement for NestJS ConfigModule.forRoot() across all services.
 * Wraps validateAndLoadConfig() to enforce Zod validation at boot time.
 *
 * Usage in AppModule:
 *   @Module({
 *     imports: [SpancleConfigModule, ...],
 *   })
 *   export class AppModule {}
 *
 * The ConfigModule is declared @Global() — no need to re-import in feature modules.
 * ConfigService<BaseConfig, true> is available for injection everywhere.
 *
 * Type-safe access:
 *   constructor(private readonly config: ConfigService<BaseConfig, true>) {}
 *   const port = this.config.get('PORT', { infer: true }); // typed as number
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache:    true,
      validate: validateAndLoadConfig,
      // env file loading is handled inside validateAndLoadConfig
      // to maintain the correct load order
      ignoreEnvFile: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class SpancleConfigModule {}

/**
 * Re-export ConfigService typed to BaseConfig for use across the codebase.
 * Import this type rather than the raw ConfigService to get type inference.
 *
 * Usage:
 *   import type { TypedConfigService } from '../../infrastructure/config/config.module';
 *   constructor(private readonly config: TypedConfigService) {}
 */
export type TypedConfigService = ConfigService<BaseConfig, true>;

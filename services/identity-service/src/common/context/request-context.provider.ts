import {
  Injectable,
  Scope,
  Inject,

  Logger,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  TENANT_RUNTIME_KEY,
  type TenantContextRuntime,
} from '../../modules/tenant/types/tenant-context.types';
import { MissingTenantContextError } from './tenant-cls.context';

/**
 * RequestContextProvider — REQUEST-scoped provider.
 *
 * Bridges the Express request object and NestJS dependency injection.
 * Services that need TenantContextRuntime inject this provider and call
 * getTenantContext() rather than reading from CLS directly.
 *
 * Scope: REQUEST — a new instance is created per HTTP request.
 * This means it CANNOT be injected into SINGLETON-scoped providers.
 * Singleton services must use TenantClsContext.getOrThrow() instead.
 *
 * Registration in AppModule:
 *   providers: [RequestContextProvider]
 *   exports:   [RequestContextProvider]
 *
 * Injection in service:
 *   constructor(
 *     private readonly requestCtx: RequestContextProvider,
 *   ) {}
 *
 *   someMethod(): void {
 *     const tenant = this.requestCtx.getTenantContext();
 *   }
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContextProvider  {
  private readonly logger = new Logger(RequestContextProvider.name);

  constructor(
    @Inject(REQUEST)
    private readonly request: Request & { [TENANT_RUNTIME_KEY]?: TenantContextRuntime },
  ) {}

  /**
   * Returns the TenantContextRuntime attached to the current request.
   * Throws MissingTenantContextError if TenantResolverMiddleware has not run.
   */
  getTenantContext(): TenantContextRuntime {
    const ctx = this.request[TENANT_RUNTIME_KEY];

    if (!ctx) {
      throw new MissingTenantContextError();
    }

    return ctx;
  }

  /**
   * Returns the TenantContextRuntime or null if not present.
   * Use when tenant context is optional (e.g. health check endpoints).
   */
  getTenantContextOrNull(): TenantContextRuntime | null {
    return this.request[TENANT_RUNTIME_KEY] ?? null;
  }

  /**
   * Convenience accessor — returns tenantId directly.
   */
  getTenantId(): string {
    return this.getTenantContext().tenantId;
  }

  /**
   * Convenience accessor — checks plan feature availability.
   */
  hasFeature(
    feature: keyof TenantContextRuntime['planLimits']['features'],
  ): boolean {
    return this.getTenantContext().planLimits.features[feature] === true;
  }

  onDestroy(): void {
    // No cleanup needed — request object cleaned up by Express
  }
}

/**
 * DI injection token for RequestContextProvider.
 * Prefer direct class injection — use this token for testing overrides.
 */
export const REQUEST_CONTEXT = Symbol('SPANCLE_REQUEST_CONTEXT');

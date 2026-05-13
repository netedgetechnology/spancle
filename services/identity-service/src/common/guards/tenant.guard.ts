import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TenantContext } from '@spancle/auth-sdk';
import { TENANT_HEADER } from '@spancle/constants';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';
import type { TenantRequest } from '../../modules/auth/types/auth-request.types';

/**
 * TenantGuard — first guard in the chain on every controller.
 *
 * Responsibilities:
 *   1. Reads `x-tenant-id` header (configurable via TENANT_HEADER env var)
 *   2. Validates it is a well-formed UUID
 *   3. Constructs a TenantContext and attaches it to request.tenant
 *
 * Throws 401 (not 400) — avoids leaking tenant resolution logic to clients.
 * Returns 401 on @Public() routes too if tenant header is present but malformed.
 * Returns early (passes) if @Public() and no tenant header provided.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  private readonly tenantHeader: string =
    process.env['TENANT_HEADER'] ?? TENANT_HEADER;

  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context
      .switchToHttp()
      .getRequest<TenantRequest>();

    const tenantId = request.headers[this.tenantHeader];

    // Public route with no tenant header — allow through without tenant context
    if (isPublic && !tenantId) {
      return true;
    }

    // Tenant header missing on protected route
    if (!tenantId || typeof tenantId !== 'string') {
      this.logger.warn(
        `Missing [${this.tenantHeader}] header — ip: ${request.ip ?? 'unknown'} path: ${request.path}`,
      );
      throw new UnauthorizedException('Tenant context is required');
    }

    // Tenant ID format validation — prevents header injection attacks
    if (!this.uuidPattern.test(tenantId)) {
      this.logger.warn(
        `Malformed tenant ID "${tenantId}" — ip: ${request.ip ?? 'unknown'}`,
      );
      throw new UnauthorizedException('Invalid tenant context');
    }

    request.tenant = TenantContext.fromRequest({ tenantId });
    return true;
  }
}

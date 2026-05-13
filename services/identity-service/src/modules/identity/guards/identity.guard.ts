import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import type { TenantContext } from '../../../common/decorators/tenant.decorator';

/**
 * TenantGuard — resolves tenant context from the configured header.
 * Must be the first guard in the chain on every controller.
 *
 * Sets request.tenant so downstream services and decorators can read it.
 * Throws 401 (not 400) to avoid leaking tenant resolution logic to clients.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly tenantHeader = process.env['TENANT_HEADER'] ?? 'x-tenant-id';

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { tenant?: TenantContext }>();

    const tenantId = request.headers[this.tenantHeader];

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      this.logger.warn(`Missing tenant header [${this.tenantHeader}] from ${request.ip ?? 'unknown'}`);
      throw new UnauthorizedException('Tenant context required');
    }

    // Basic UUID-format validation — prevents header injection
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(tenantId)) {
      this.logger.warn(`Invalid tenant ID format: ${tenantId}`);
      throw new UnauthorizedException('Invalid tenant context');
    }

    request.tenant = { tenantId };
    return true;
  }
}

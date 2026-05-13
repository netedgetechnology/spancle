import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly tenantHeader = process.env['TENANT_HEADER'] ?? 'x-tenant-id';
  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { tenant?: TenantContext }>();

    const tenantId = request.headers[this.tenantHeader];

    if (!tenantId || typeof tenantId !== 'string' || !this.uuidPattern.test(tenantId)) {
      this.logger.warn(`Invalid or missing tenant header from ${request.ip ?? 'unknown'}`);
      throw new UnauthorizedException('Tenant context required');
    }

    request.tenant = { tenantId };
    return true;
  }
}

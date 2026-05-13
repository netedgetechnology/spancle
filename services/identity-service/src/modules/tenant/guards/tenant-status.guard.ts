import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/roles.decorator';
import {
  TENANT_RUNTIME_KEY,
  isTenantActive,
  isTenantSuspended,
  isTenantTerminated,
} from '../types/tenant-context.types';
import type { TenantRuntimeRequest } from '../types/tenant-context.types';

/**
 * TenantStatusGuard — enforces tenant lifecycle state on every request.
 *
 * Execution position: after JwtAuthGuard, before RolesGuard.
 *
 * Status rules:
 *   - active / trial  → allowed
 *   - pending         → allowed (tenant is setting up)
 *   - suspended       → 503 Service Unavailable
 *   - terminated      → 503 Service Unavailable
 *
 * Unlike TenantGuard which validates the header format,
 * TenantStatusGuard validates the tenant's BUSINESS STATUS.
 *
 * @Public() routes are allowed for all statuses EXCEPT terminated.
 * Terminated tenants cannot access even public endpoints — their
 * data is in retention and their account is closed.
 */
@Injectable()
export class TenantStatusGuard implements CanActivate {
  private readonly logger = new Logger(TenantStatusGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<TenantRuntimeRequest>();

    const runtime = request[TENANT_RUNTIME_KEY];

    // No runtime — TenantResolverMiddleware hasn't run or tenant wasn't resolved
    // Let downstream guards handle this case
    if (!runtime) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Terminated tenants are completely blocked — even public routes
    if (isTenantTerminated(runtime)) {
      this.logger.warn(
        `Blocked TERMINATED tenant: ${runtime.tenantId} (${runtime.slug}) — path: ${
          (request as unknown as { path: string }).path
        }`,
      );
      throw new ServiceUnavailableException(
        'This account has been terminated. Please contact support.',
      );
    }

    // Suspended tenants cannot access protected routes
    // Public routes (login, password reset) are allowed so they can resolve support issues
    if (isSuspended(runtime) && !isPublic) {
      this.logger.warn(
        `Blocked SUSPENDED tenant: ${runtime.tenantId} (${runtime.slug}) — path: ${
          (request as unknown as { path: string }).path
        }`,
      );
      throw new ServiceUnavailableException(
        'This account has been suspended. Please contact support.',
      );
    }

    return true;
  }
}

function isSuspended(runtime: { status: string }): boolean {
  return runtime.status === 'suspended';
}

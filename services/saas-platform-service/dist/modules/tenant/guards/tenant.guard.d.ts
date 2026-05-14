import { type CanActivate, type ExecutionContext } from '@nestjs/common';
export declare class TenantGuard implements CanActivate {
    private readonly logger;
    private readonly tenantHeader;
    private readonly uuidPattern;
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=tenant.guard.d.ts.map
import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../notification/guards/notification.guard';

/**
 * TemplateGuard — extends TenantGuard.
 * Add template-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class TemplateGuard extends TenantGuard {}

export { TenantGuard } from '../../notification/guards/notification.guard';

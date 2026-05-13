import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../notification/guards/notification.guard';

/**
 * MessageGuard — extends TenantGuard.
 * Add message-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class MessageGuard extends TenantGuard {}

export { TenantGuard } from '../../notification/guards/notification.guard';

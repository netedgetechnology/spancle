import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';

@Injectable()
export class UserGuard extends TenantGuard {}

export { TenantGuard } from '../../../common/guards/tenant.guard';

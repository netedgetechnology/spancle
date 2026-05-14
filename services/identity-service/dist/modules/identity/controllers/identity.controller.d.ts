import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { IdentityService } from '../services/identity.service';
import { LoginDto } from '../dto/create-identity.dto';
import { RefreshTokenDto } from '../dto/update-identity.dto';
export declare class IdentityController {
    private readonly identityService;
    constructor(identityService: IdentityService);
    login(dto: LoginDto, tenant: TenantContext): Promise<unknown>;
    refresh(dto: RefreshTokenDto, tenant: TenantContext): Promise<unknown>;
    logout(dto: RefreshTokenDto, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=identity.controller.d.ts.map
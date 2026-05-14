import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IdentityRepository } from '../repositories/identity.repository';
import type { LoginDto } from '../dto/create-identity.dto';
import type { RefreshTokenDto } from '../dto/update-identity.dto';
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare class IdentityService {
    private readonly identityRepository;
    private readonly jwtService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(identityRepository: IdentityRepository, jwtService: JwtService, eventEmitter: EventEmitter2);
    login(dto: LoginDto, tenantId: string): Promise<TokenPair>;
    refreshToken(dto: RefreshTokenDto, tenantId: string): Promise<TokenPair>;
    logout(refreshToken: string, tenantId: string): Promise<void>;
    private generateTokenPair;
}
//# sourceMappingURL=identity.service.d.ts.map
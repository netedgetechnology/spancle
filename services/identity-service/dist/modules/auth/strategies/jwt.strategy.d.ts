import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '@spancle/types';
import { AuthRepository } from '../repositories/auth.repository';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
/**
 * JwtStrategy — validates access tokens extracted from Authorization: Bearer header.
 *
 * Validation pipeline:
 *   1. Passport extracts token from Authorization header
 *   2. passport-jwt verifies signature using JWT_SECRET
 *   3. JwtStrategy.validate() runs structural + business validation:
 *      a. Zod schema validation of payload shape
 *      b. Checks token JTI is not blacklisted in Redis
 *      c. Ensures tenant context on payload matches request tenant
 *
 * Returns the validated JwtPayload → set as request.user by Passport.
 *
 * Secret rotation: if JWT_SECRET verification fails, passport-jwt will
 * not call validate() — the error is caught by JwtAuthGuard.handleRequest().
 */
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly authRepository;
    private readonly logger;
    constructor(config: ConfigService, authRepository: AuthRepository);
    /**
     * Called by Passport after signature verification passes.
     * The return value becomes request.user.
     * Throw UnauthorizedException to reject the request.
     */
    validate(rawPayload: unknown): Promise<JwtPayload>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map
import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export interface BookingActorContext {
  /**
   * actorId = JWT `sub` = identityId (the Identity record, not the User profile).
   * Used for audit logging and admin ownership.
   */
  actorId:  string;
  tenantId: string;
  role:     string;
  /**
   * userId = JWT `userId` = the User profile ID stored on BookingEntity.userId.
   * Populated by RbacGuard from the verified JWT payload.
   * Required for booking ownership checks (booking.userId == actor.userId).
   */
  userId:   string | null;
}

/**
 * @BookingActor() — extracts actor context set by RbacGuard.
 * Throws 401 if no actor found on request.
 */
export const BookingActor = createParamDecorator(
  (field: keyof BookingActorContext | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request & { actor?: BookingActorContext }>();
    if (!req.actor) throw new UnauthorizedException('Actor context required');
    return field ? req.actor[field] : req.actor;
  },
);

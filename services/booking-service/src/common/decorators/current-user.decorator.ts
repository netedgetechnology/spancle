import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export interface BookingActorContext {
  actorId:  string;
  tenantId: string;
  role:     string;
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

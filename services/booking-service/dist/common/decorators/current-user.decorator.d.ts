export interface BookingActorContext {
    actorId: string;
    tenantId: string;
    role: string;
}
/**
 * @BookingActor() — extracts actor context set by RbacGuard.
 * Throws 401 if no actor found on request.
 */
export declare const BookingActor: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof BookingActorContext | undefined)[]) => ParameterDecorator;
//# sourceMappingURL=current-user.decorator.d.ts.map
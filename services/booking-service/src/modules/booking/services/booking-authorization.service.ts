import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { BookingEntity } from '../entities/booking.entity';
import type { BookingActorContext } from '../../../common/decorators/current-user.decorator';

/**
 * BookingAuthorizationService
 *
 * Centralizes booking ownership enforcement for every endpoint that a
 * PLAYER role can access.
 *
 * ── Identity model reminder ───────────────────────────────────────────────────
 *
 *   JWT.sub      = identityId    → actor.actorId (used for audit logging)
 *   JWT.userId   = user profile  → actor.userId  (used for booking ownership)
 *   BookingEntity.userId         = dto.customer.userId = JWT.userId
 *
 *   Ownership check: booking.userId === actor.userId
 *   NOT:             booking.userId === actor.actorId  ← WRONG (identityId)
 *
 * ── Staff bypass ─────────────────────────────────────────────────────────────
 *
 * TENANT_ADMIN, TENANT_MANAGER, COACH, SUPER_ADMIN → pass unconditionally.
 * Only PLAYER role is subject to ownership checks.
 *
 * ── Why a service, not a guard ───────────────────────────────────────────────
 *
 * Ownership requires the booking entity (a DB read). Guards execute before
 * controllers load entities, which would require a second DB lookup.
 * A service called after the entity is loaded avoids redundant queries,
 * integrates naturally with the existing controller pattern, and is
 * independently testable.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // In any controller method that a PLAYER can reach:
 *   const booking = await this.bookingService.findOne(id, tenant.tenantId);
 *   this.authzService.assertOwnerOrStaff(booking, actor);   // throws 403 if violated
 *   // ... proceed with operation ...
 */
@Injectable()
export class BookingAuthorizationService {
  private readonly logger = new Logger(BookingAuthorizationService.name);

  /** Roles that bypass ownership checks — can act on any tenant booking. */
  private readonly STAFF_ROLES = new Set([
    'TENANT_ADMIN',
    'TENANT_MANAGER',
    'COACH',
    'SUPER_ADMIN',
  ]);

  /**
   * assertOwnerOrStaff
   *
   * Throws ForbiddenException when:
   *   1. The actor is PLAYER role, AND
   *   2. booking.userId !== actor.userId
   *
   * Passes when:
   *   - Actor is TENANT_ADMIN / TENANT_MANAGER / COACH / SUPER_ADMIN
   *   - Actor is PLAYER AND booking.userId === actor.userId
   *
   * @param booking  The loaded BookingEntity
   * @param actor    The authenticated actor from RbacGuard
   * @param resource Optional label for the log message (e.g. 'cancel', 'QR')
   */
  assertOwnerOrStaff(
    booking: Pick<BookingEntity, 'id' | 'userId' | 'reference'>,
    actor:   BookingActorContext,
    resource = 'booking',
  ): void {
    // Staff roles bypass all ownership checks
    if (this.STAFF_ROLES.has(actor.role)) return;

    // For PLAYER (and any unlisted role) — must own the booking
    if (!actor.userId || booking.userId !== actor.userId) {
      this.logger.warn(
        `Booking ownership violation — ` +
        `actor=${actor.actorId} role=${actor.role} userId=${actor.userId ?? 'null'} ` +
        `booking=${booking.id} ref=${booking.reference} ` +
        `owner=${booking.userId ?? 'null'} resource=${resource}`,
      );
      throw new ForbiddenException(
        `You do not have permission to access this ${resource}`,
      );
    }
  }

  /**
   * isOwnerOrStaff
   *
   * Non-throwing equivalent of assertOwnerOrStaff.
   * Returns true when the actor is permitted; false when ownership fails.
   * Useful for conditional logic (e.g. partial response shaping).
   */
  isOwnerOrStaff(
    booking: Pick<BookingEntity, 'userId'>,
    actor:   BookingActorContext,
  ): boolean {
    if (this.STAFF_ROLES.has(actor.role)) return true;
    return !!actor.userId && booking.userId === actor.userId;
  }
}

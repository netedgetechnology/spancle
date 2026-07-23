import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }             from '@nestjs/event-emitter';
import { DataSource }          from 'typeorm';
import { BookingEntity }       from '../booking/entities/booking.entity';

/**
 * GuestBookingLinkingService
 *
 * Listens for `consumer.registered` events emitted by identity-service
 * and links historical guest bookings (userId=null) to the new user.
 *
 * Architecture:
 *   - No API call to identity-service — event-driven via EventEmitter2
 *   - Single UPDATE query: WHERE tenantId=? AND customerEmail=? AND userId IS NULL
 *   - Idempotent: repeated events produce no effect once userId is set
 *   - Audit: logs the number of bookings linked
 *
 * This is the correct approach per ADR-GUEST-001:
 *   "Link previous bookings: WHERE tenantId=? AND customerEmail=? AND userId IS NULL"
 *
 * Note: In a distributed system with separate booking-service and identity-service
 * processes, this listener would be wired via a message bus (Redis Streams or
 * similar). In the current monorepo setup both services can be event-bridged.
 * For now, this service is triggered by an explicit POST /guest/link-bookings
 * endpoint called from the consumer-booking frontend after registration.
 */
@Injectable()
export class GuestBookingLinkingService {
  private readonly logger = new Logger(GuestBookingLinkingService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * linkGuestBookings()
   *
   * Updates all guest bookings for the given email to set userId.
   * Called by GuestController.linkBookings() after consumer registration.
   *
   * @returns number of bookings linked
   */
  async linkGuestBookings(params: {
    userId:        string;
    customerEmail: string;
    tenantId:      string;
  }): Promise<{ linked: number }> {
    const email = params.customerEmail.toLowerCase().trim();

    const result = await this.dataSource
      .createQueryBuilder()
      .update(BookingEntity)
      .set({ userId: params.userId })
      .where('tenantId = :tenantId', { tenantId: params.tenantId })
      .andWhere('customerEmail = :email', { email })
      .andWhere('userId IS NULL')
      .andWhere('isDeleted = false')
      .execute();

    const linked = result.affected ?? 0;

    if (linked > 0) {
      this.logger.log(
        `Guest bookings linked — tenant=${params.tenantId} ` +
        `userId=${params.userId} email=[masked] linked=${linked}`,
      );
    }

    return { linked };
  }
}

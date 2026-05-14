import type { Booking, CreateBookingDto, Slot, Venue, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * BookingClient — typed client for booking-service.
 *
 * Covers: bookings, slot availability, venue management.
 */
export declare const BookingClient: {
    createBooking(dto: CreateBookingDto, ctx: RequestContext): Promise<Booking>;
    getBookingById(bookingId: string, ctx: RequestContext): Promise<Booking>;
    listBookings(params: {
        page?: number;
        limit?: number;
        userId?: string;
        status?: string;
        venueId?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Booking>>;
    confirmBooking(bookingId: string, ctx: RequestContext): Promise<Booking>;
    cancelBooking(bookingId: string, reason: string, ctx: RequestContext): Promise<Booking>;
    completeBooking(bookingId: string, ctx: RequestContext): Promise<Booking>;
    getAvailableSlots(venueId: string, params: {
        date: string;
        sport?: string;
    }, ctx: RequestContext): Promise<Slot[]>;
    getSlotById(slotId: string, ctx: RequestContext): Promise<Slot>;
    createVenue(dto: Omit<Venue, "id" | "tenantId" | "createdAt" | "updatedAt" | "isDeleted">, ctx: RequestContext): Promise<Venue>;
    getVenueById(venueId: string, ctx: RequestContext): Promise<Venue>;
    listVenues(params: {
        page?: number;
        limit?: number;
        isActive?: boolean;
    }, ctx: RequestContext): Promise<PaginatedResult<Venue>>;
    updateVenue(venueId: string, dto: Partial<Venue>, ctx: RequestContext): Promise<Venue>;
};
//# sourceMappingURL=booking.client.d.ts.map
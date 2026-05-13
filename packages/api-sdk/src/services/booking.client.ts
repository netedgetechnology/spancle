import type {
  Booking,
  CreateBookingDto,
  Slot,
  Venue,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('booking');

/**
 * BookingClient — typed client for booking-service.
 *
 * Covers: bookings, slot availability, venue management.
 */
export const BookingClient = {

  // ── Bookings ──────────────────────────────────────────────────────────────

  async createBooking(dto: CreateBookingDto, ctx: RequestContext): Promise<Booking> {
    return http.post<Booking>('/bookings', dto, ctx);
  },

  async getBookingById(bookingId: string, ctx: RequestContext): Promise<Booking> {
    return http.get<Booking>(`/bookings/${bookingId}`, ctx);
  },

  async listBookings(
    params: { page?: number; limit?: number; userId?: string; status?: string; venueId?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Booking>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<Booking>>(`/bookings${query ? `?${query}` : ''}`, ctx);
  },

  async confirmBooking(bookingId: string, ctx: RequestContext): Promise<Booking> {
    return http.post<Booking>(`/bookings/${bookingId}/confirm`, {}, ctx);
  },

  async cancelBooking(
    bookingId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<Booking> {
    return http.post<Booking>(`/bookings/${bookingId}/cancel`, { reason }, ctx);
  },

  async completeBooking(bookingId: string, ctx: RequestContext): Promise<Booking> {
    return http.post<Booking>(`/bookings/${bookingId}/complete`, {}, ctx);
  },

  // ── Slots ─────────────────────────────────────────────────────────────────

  async getAvailableSlots(
    venueId: string,
    params: { date: string; sport?: string },
    ctx: RequestContext,
  ): Promise<Slot[]> {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<Slot[]>(`/venues/${venueId}/slots/available?${query}`, ctx);
  },

  async getSlotById(slotId: string, ctx: RequestContext): Promise<Slot> {
    return http.get<Slot>(`/slots/${slotId}`, ctx);
  },

  // ── Venues ────────────────────────────────────────────────────────────────

  async createVenue(
    dto: Omit<Venue, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
    ctx: RequestContext,
  ): Promise<Venue> {
    return http.post<Venue>('/venues', dto, ctx);
  },

  async getVenueById(venueId: string, ctx: RequestContext): Promise<Venue> {
    return http.get<Venue>(`/venues/${venueId}`, ctx);
  },

  async listVenues(
    params: { page?: number; limit?: number; isActive?: boolean },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Venue>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<Venue>>(`/venues${query ? `?${query}` : ''}`, ctx);
  },

  async updateVenue(
    venueId: string,
    dto: Partial<Venue>,
    ctx: RequestContext,
  ): Promise<Venue> {
    return http.patch<Venue>(`/venues/${venueId}`, dto, ctx);
  },
};

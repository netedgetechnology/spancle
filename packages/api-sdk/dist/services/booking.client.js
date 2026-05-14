"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('booking');
/**
 * BookingClient — typed client for booking-service.
 *
 * Covers: bookings, slot availability, venue management.
 */
exports.BookingClient = {
    // ── Bookings ──────────────────────────────────────────────────────────────
    async createBooking(dto, ctx) {
        return http.post('/bookings', dto, ctx);
    },
    async getBookingById(bookingId, ctx) {
        return http.get(`/bookings/${bookingId}`, ctx);
    },
    async listBookings(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/bookings${query ? `?${query}` : ''}`, ctx);
    },
    async confirmBooking(bookingId, ctx) {
        return http.post(`/bookings/${bookingId}/confirm`, {}, ctx);
    },
    async cancelBooking(bookingId, reason, ctx) {
        return http.post(`/bookings/${bookingId}/cancel`, { reason }, ctx);
    },
    async completeBooking(bookingId, ctx) {
        return http.post(`/bookings/${bookingId}/complete`, {}, ctx);
    },
    // ── Slots ─────────────────────────────────────────────────────────────────
    async getAvailableSlots(venueId, params, ctx) {
        const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/venues/${venueId}/slots/available?${query}`, ctx);
    },
    async getSlotById(slotId, ctx) {
        return http.get(`/slots/${slotId}`, ctx);
    },
    // ── Venues ────────────────────────────────────────────────────────────────
    async createVenue(dto, ctx) {
        return http.post('/venues', dto, ctx);
    },
    async getVenueById(venueId, ctx) {
        return http.get(`/venues/${venueId}`, ctx);
    },
    async listVenues(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/venues${query ? `?${query}` : ''}`, ctx);
    },
    async updateVenue(venueId, dto, ctx) {
        return http.patch(`/venues/${venueId}`, dto, ctx);
    },
};
//# sourceMappingURL=booking.client.js.map
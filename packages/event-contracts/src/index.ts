/**
 * @spancle/event-contracts — Typed event schemas for all Redis Pub/Sub channels.
 *
 * Rules:
 *   - All events MUST use EventEnvelope as outer wrapper
 *   - All payload schemas are Zod schemas — validate on both produce and consume
 *   - EventRegistry is the single source of truth for channel names
 *   - Never publish or subscribe using raw strings — always use EventRegistry.*
 */

export * from './core/event-envelope';
export * from './core/event-registry';
export * from './domains/identity.events';
export * from './domains/tenant.events';
export * from './domains/booking.events';
export * from './domains/finance.events';
export * from './domains/tournament.events';
export * from './domains/academy.events';
export * from './domains/communication.events';
export * from './domains/reporting.events';

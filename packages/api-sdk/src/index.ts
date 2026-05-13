/**
 * @spancle/api-sdk — Typed HTTP clients for all Spancle platform services.
 *
 * Usage:
 *   import { IdentityClient, RequestContext } from '@spancle/api-sdk';
 *
 *   const ctx = RequestContext.fromSession(session);
 *   const tokens = await IdentityClient.login({ email, password }, ctx);
 *
 * Key contracts:
 *   - Every method requires a RequestContext — never stores auth state
 *   - All errors thrown as SpancleApiError — use isSpancleApiError() to narrow
 *   - All return types sourced from @spancle/types — no local redefinitions
 *   - createHttpClient() is a factory — never a module-level singleton
 */

// ── Core ──────────────────────────────────────────────────────────────────────
export { RequestContext }             from './core/request-context';
export { HttpClient, createHttpClient, resolveServiceUrl } from './core/http-client';
export {
  SpancleApiError,
  isSpancleApiError,
  normaliseError,
  ApiErrorPayloadSchema,
  type ApiErrorPayload,
}                                     from './core/api-error';

// ── Service Clients ───────────────────────────────────────────────────────────
export { IdentityClient }             from './services/identity.client';
export { SaasPlatformClient }         from './services/saas-platform.client';
export { BookingClient }              from './services/booking.client';
export { FinanceClient }              from './services/finance.client';
export { TournamentClient }           from './services/tournament.client';
export { AcademyClient }              from './services/academy.client';
export { CommunicationClient }        from './services/communication.client';
export { ReportingClient }            from './services/reporting.client';

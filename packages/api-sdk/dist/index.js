"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingClient = exports.CommunicationClient = exports.AcademyClient = exports.TournamentClient = exports.FinanceClient = exports.BookingClient = exports.SaasPlatformClient = exports.IdentityClient = exports.ApiErrorPayloadSchema = exports.normaliseError = exports.isSpancleApiError = exports.SpancleApiError = exports.resolveServiceUrl = exports.createHttpClient = exports.HttpClient = exports.RequestContext = void 0;
// ── Core ──────────────────────────────────────────────────────────────────────
var request_context_1 = require("./core/request-context");
Object.defineProperty(exports, "RequestContext", { enumerable: true, get: function () { return request_context_1.RequestContext; } });
var http_client_1 = require("./core/http-client");
Object.defineProperty(exports, "HttpClient", { enumerable: true, get: function () { return http_client_1.HttpClient; } });
Object.defineProperty(exports, "createHttpClient", { enumerable: true, get: function () { return http_client_1.createHttpClient; } });
Object.defineProperty(exports, "resolveServiceUrl", { enumerable: true, get: function () { return http_client_1.resolveServiceUrl; } });
var api_error_1 = require("./core/api-error");
Object.defineProperty(exports, "SpancleApiError", { enumerable: true, get: function () { return api_error_1.SpancleApiError; } });
Object.defineProperty(exports, "isSpancleApiError", { enumerable: true, get: function () { return api_error_1.isSpancleApiError; } });
Object.defineProperty(exports, "normaliseError", { enumerable: true, get: function () { return api_error_1.normaliseError; } });
Object.defineProperty(exports, "ApiErrorPayloadSchema", { enumerable: true, get: function () { return api_error_1.ApiErrorPayloadSchema; } });
// ── Service Clients ───────────────────────────────────────────────────────────
var identity_client_1 = require("./services/identity.client");
Object.defineProperty(exports, "IdentityClient", { enumerable: true, get: function () { return identity_client_1.IdentityClient; } });
var saas_platform_client_1 = require("./services/saas-platform.client");
Object.defineProperty(exports, "SaasPlatformClient", { enumerable: true, get: function () { return saas_platform_client_1.SaasPlatformClient; } });
var booking_client_1 = require("./services/booking.client");
Object.defineProperty(exports, "BookingClient", { enumerable: true, get: function () { return booking_client_1.BookingClient; } });
var finance_client_1 = require("./services/finance.client");
Object.defineProperty(exports, "FinanceClient", { enumerable: true, get: function () { return finance_client_1.FinanceClient; } });
var tournament_client_1 = require("./services/tournament.client");
Object.defineProperty(exports, "TournamentClient", { enumerable: true, get: function () { return tournament_client_1.TournamentClient; } });
var academy_client_1 = require("./services/academy.client");
Object.defineProperty(exports, "AcademyClient", { enumerable: true, get: function () { return academy_client_1.AcademyClient; } });
var communication_client_1 = require("./services/communication.client");
Object.defineProperty(exports, "CommunicationClient", { enumerable: true, get: function () { return communication_client_1.CommunicationClient; } });
var reporting_client_1 = require("./services/reporting.client");
Object.defineProperty(exports, "ReportingClient", { enumerable: true, get: function () { return reporting_client_1.ReportingClient; } });
//# sourceMappingURL=index.js.map
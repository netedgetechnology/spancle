"use strict";
/**
 * API Constants
 * Shared across all services and SDK clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_PORTS = exports.PAGINATION_DEFAULTS = exports.HTTP_STATUS = exports.API_TIMEOUTS_MS = exports.API_HEADERS = exports.API_VERSION = void 0;
exports.API_VERSION = 'v1';
exports.API_HEADERS = {
    TENANT_ID: 'x-tenant-id',
    TENANT_SLUG: 'x-tenant-slug',
    REQUEST_ID: 'x-request-id',
    CORRELATION_ID: 'x-correlation-id',
    API_KEY: 'x-api-key',
    IDEMPOTENCY_KEY: 'x-idempotency-key',
};
exports.API_TIMEOUTS_MS = {
    DEFAULT: 30_000,
    UPLOAD: 120_000,
    REPORT: 60_000,
    HEALTH: 5_000,
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
exports.PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100,
};
/** Internal service base URLs — overridden by env vars in production */
exports.SERVICE_PORTS = {
    IDENTITY: 3001,
    SAAS_PLATFORM: 3002,
    BOOKING: 3003,
    FINANCE: 3004,
    TOURNAMENT: 3005,
    ACADEMY: 3006,
    COMMUNICATION: 3007,
    REPORTING: 3008,
};
//# sourceMappingURL=api.constants.js.map
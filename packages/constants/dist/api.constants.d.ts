/**
 * API Constants
 * Shared across all services and SDK clients.
 */
export declare const API_VERSION: "v1";
export declare const API_HEADERS: {
    readonly TENANT_ID: "x-tenant-id";
    readonly TENANT_SLUG: "x-tenant-slug";
    readonly REQUEST_ID: "x-request-id";
    readonly CORRELATION_ID: "x-correlation-id";
    readonly API_KEY: "x-api-key";
    readonly IDEMPOTENCY_KEY: "x-idempotency-key";
};
export declare const API_TIMEOUTS_MS: {
    readonly DEFAULT: 30000;
    readonly UPLOAD: 120000;
    readonly REPORT: 60000;
    readonly HEALTH: 5000;
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const PAGINATION_DEFAULTS: {
    readonly PAGE: 1;
    readonly LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
/** Internal service base URLs — overridden by env vars in production */
export declare const SERVICE_PORTS: {
    readonly IDENTITY: 3001;
    readonly SAAS_PLATFORM: 3002;
    readonly BOOKING: 3003;
    readonly FINANCE: 3004;
    readonly TOURNAMENT: 3005;
    readonly ACADEMY: 3006;
    readonly COMMUNICATION: 3007;
    readonly REPORTING: 3008;
};
//# sourceMappingURL=api.constants.d.ts.map
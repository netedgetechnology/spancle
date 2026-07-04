"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
exports.resolveServiceUrl = resolveServiceUrl;
exports.createHttpClient = createHttpClient;
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("@spancle/constants");
const api_error_1 = require("./api-error");
/**
 * HttpClient — the single Axios wrapper used by all service clients.
 *
 * Responsibilities:
 *   1. Injects tenant and auth headers from RequestContext on every request
 *   2. Normalises all errors to SpancleApiError
 *   3. Enforces timeouts
 *   4. Attaches x-request-id for distributed tracing
 *
 * NOT a singleton — instantiate one per service client (see service clients).
 * The caller is responsible for passing a fresh RequestContext per call.
 */
class HttpClient {
    constructor(config) {
        this.axios = axios_1.default.create({
            baseURL: config.baseURL,
            timeout: config.timeoutMs ?? constants_1.API_TIMEOUTS_MS.DEFAULT,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
        this.attachResponseInterceptor();
    }
    // ── Public request methods ─────────────────────────────────────────────────
    async get(path, ctx, config) {
        const response = await this.axios.get(path, this.mergeConfig(ctx, config));
        return response.data;
    }
    async post(path, body, ctx, config) {
        const response = await this.axios.post(path, body, this.mergeConfig(ctx, config));
        return response.data;
    }
    async patch(path, body, ctx, config) {
        const response = await this.axios.patch(path, body, this.mergeConfig(ctx, config));
        return response.data;
    }
    async put(path, body, ctx, config) {
        const response = await this.axios.put(path, body, this.mergeConfig(ctx, config));
        return response.data;
    }
    async delete(path, ctx, config) {
        const response = await this.axios.delete(path, this.mergeConfig(ctx, config));
        return response.data;
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    mergeConfig(ctx, config) {
        return {
            ...config,
            timeout: ctx.timeoutMs ?? config?.timeout,
            headers: {
                ...config?.headers,
                ...ctx.toHeaders(),
                'x-request-id': crypto.randomUUID(),
            },
        };
    }
    attachResponseInterceptor() {
        this.axios.interceptors.response.use((response) => response, (error) => {
            const normalisedError = (0, api_error_1.normaliseError)(error);
            return Promise.reject(normalisedError);
        });
    }
}
exports.HttpClient = HttpClient;
const SERVICE_ENV_VARS = {
    'identity': 'IDENTITY_SERVICE_URL',
    'saas-platform': 'SAAS_PLATFORM_SERVICE_URL',
    'booking': 'BOOKING_SERVICE_URL',
    'finance': 'FINANCE_SERVICE_URL',
    'tournament': 'TOURNAMENT_SERVICE_URL',
    'academy': 'ACADEMY_SERVICE_URL',
    'communication': 'COMMUNICATION_SERVICE_URL',
    'reporting': 'REPORTING_SERVICE_URL',
};
const SERVICE_DEFAULT_PORTS = {
    'identity': constants_1.SERVICE_PORTS.IDENTITY,
    'saas-platform': constants_1.SERVICE_PORTS.SAAS_PLATFORM,
    'booking': constants_1.SERVICE_PORTS.BOOKING,
    'finance': constants_1.SERVICE_PORTS.FINANCE,
    'tournament': constants_1.SERVICE_PORTS.TOURNAMENT,
    'academy': constants_1.SERVICE_PORTS.ACADEMY,
    'communication': constants_1.SERVICE_PORTS.COMMUNICATION,
    'reporting': constants_1.SERVICE_PORTS.REPORTING,
};
/**
 * Resolves service base URL from environment variable or localhost fallback.
 * In production, env vars point to internal Kubernetes service DNS.
 */
function resolveServiceUrl(service) {
    const envVar = SERVICE_ENV_VARS[service];
    const fromEnv = typeof process !== 'undefined' ? process.env[envVar] : undefined;
    if (fromEnv)
        return fromEnv;
    return `http://localhost:${SERVICE_DEFAULT_PORTS[service]}/api/v1`;
}
/**
 * Factory — creates a pre-configured HttpClient for a given service.
 * Call once at module load time inside each service client class.
 */
function createHttpClient(service, overrideUrl) {
    return new HttpClient({
        baseURL: overrideUrl ?? resolveServiceUrl(service),
        serviceName: service,
    });
}
//# sourceMappingURL=http-client.js.map
import { type AxiosRequestConfig } from 'axios';
import type { RequestContext } from './request-context';
export interface HttpClientConfig {
    /** Base URL for the target service */
    baseURL: string;
    /** Default timeout in ms — overridden by RequestContext.timeoutMs */
    timeoutMs?: number;
    /** Service name — used in error logging */
    serviceName: string;
}
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
export declare class HttpClient {
    private readonly axios;
    private readonly serviceName;
    constructor(config: HttpClientConfig);
    get<T>(path: string, ctx: RequestContext, config?: AxiosRequestConfig): Promise<T>;
    post<T>(path: string, body: unknown, ctx: RequestContext, config?: AxiosRequestConfig): Promise<T>;
    patch<T>(path: string, body: unknown, ctx: RequestContext, config?: AxiosRequestConfig): Promise<T>;
    put<T>(path: string, body: unknown, ctx: RequestContext, config?: AxiosRequestConfig): Promise<T>;
    delete<T = void>(path: string, ctx: RequestContext, config?: AxiosRequestConfig): Promise<T>;
    private mergeConfig;
    private attachResponseInterceptor;
}
type ServiceName = 'identity' | 'saas-platform' | 'booking' | 'finance' | 'tournament' | 'academy' | 'communication' | 'reporting';
/**
 * Resolves service base URL from environment variable or localhost fallback.
 * In production, env vars point to internal Kubernetes service DNS.
 */
export declare function resolveServiceUrl(service: ServiceName): string;
/**
 * Factory — creates a pre-configured HttpClient for a given service.
 * Call once at module load time inside each service client class.
 */
export declare function createHttpClient(service: ServiceName, overrideUrl?: string): HttpClient;
export {};
//# sourceMappingURL=http-client.d.ts.map
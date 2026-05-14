import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { API_TIMEOUTS_MS, SERVICE_PORTS } from '@spancle/constants';
import { normaliseError } from './api-error';
import type { RequestContext } from './request-context';

export interface HttpClientConfig {
  /** Base URL for the target service */
  baseURL:    string;
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
export class HttpClient {
  private readonly axios: AxiosInstance;
  private readonly serviceName: string;

  constructor(config: HttpClientConfig) {
    this.serviceName = config.serviceName;

    this.axios = axios.create({
      baseURL:         config.baseURL,
      timeout:         config.timeoutMs ?? API_TIMEOUTS_MS.DEFAULT,
      headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
    });

    this.attachResponseInterceptor();
  }

  // ── Public request methods ─────────────────────────────────────────────────

  async get<T>(
    path: string,
    ctx: RequestContext,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axios.get<T>(path, this.mergeConfig(ctx, config));
    return response.data;
  }

  async post<T>(
    path: string,
    body: unknown,
    ctx: RequestContext,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axios.post<T>(path, body, this.mergeConfig(ctx, config));
    return response.data;
  }

  async patch<T>(
    path: string,
    body: unknown,
    ctx: RequestContext,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axios.patch<T>(path, body, this.mergeConfig(ctx, config));
    return response.data;
  }

  async put<T>(
    path: string,
    body: unknown,
    ctx: RequestContext,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axios.put<T>(path, body, this.mergeConfig(ctx, config));
    return response.data;
  }

  async delete<T = void>(
    path: string,
    ctx: RequestContext,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axios.delete<T>(path, this.mergeConfig(ctx, config));
    return response.data;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private mergeConfig(
    ctx: RequestContext,
    config?: AxiosRequestConfig,
  ): AxiosRequestConfig {
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

  private attachResponseInterceptor(): void {
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: unknown) => {
        const normalisedError = normaliseError(error);
        return Promise.reject(normalisedError);
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service URL resolver
// ─────────────────────────────────────────────────────────────────────────────

type ServiceName =
  | 'identity'
  | 'saas-platform'
  | 'booking'
  | 'finance'
  | 'tournament'
  | 'academy'
  | 'communication'
  | 'reporting';

const SERVICE_ENV_VARS: Record<ServiceName, string> = {
  'identity':      'IDENTITY_SERVICE_URL',
  'saas-platform': 'SAAS_PLATFORM_SERVICE_URL',
  'booking':       'BOOKING_SERVICE_URL',
  'finance':       'FINANCE_SERVICE_URL',
  'tournament':    'TOURNAMENT_SERVICE_URL',
  'academy':       'ACADEMY_SERVICE_URL',
  'communication': 'COMMUNICATION_SERVICE_URL',
  'reporting':     'REPORTING_SERVICE_URL',
};

const SERVICE_DEFAULT_PORTS: Record<ServiceName, number> = {
  'identity':      SERVICE_PORTS.IDENTITY,
  'saas-platform': SERVICE_PORTS.SAAS_PLATFORM,
  'booking':       SERVICE_PORTS.BOOKING,
  'finance':       SERVICE_PORTS.FINANCE,
  'tournament':    SERVICE_PORTS.TOURNAMENT,
  'academy':       SERVICE_PORTS.ACADEMY,
  'communication': SERVICE_PORTS.COMMUNICATION,
  'reporting':     SERVICE_PORTS.REPORTING,
};

/**
 * Resolves service base URL from environment variable or localhost fallback.
 * In production, env vars point to internal Kubernetes service DNS.
 */
export function resolveServiceUrl(service: ServiceName): string {
  const envVar  = SERVICE_ENV_VARS[service];
  const fromEnv = typeof process !== 'undefined' ? process.env[envVar] : undefined;
  if (fromEnv) return fromEnv;
  return `http://localhost:${SERVICE_DEFAULT_PORTS[service]}/api/v1`;
}

/**
 * Factory — creates a pre-configured HttpClient for a given service.
 * Call once at module load time inside each service client class.
 */
export function createHttpClient(
  service: ServiceName,
  overrideUrl?: string,
): HttpClient {
  return new HttpClient({
    baseURL:     overrideUrl ?? resolveServiceUrl(service),
    serviceName: service,
  });
}

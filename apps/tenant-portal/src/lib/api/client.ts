import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getSession } from 'next-auth/react';
import type { ApiError } from '@/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api';

/**
 * Authenticated API client.
 *
 * Request interceptor:
 *   - Attaches Bearer token from NextAuth session
 *   - Injects x-tenant-id header (tenant isolation enforcement)
 *
 * Response interceptor:
 *   - Normalises all errors to ApiError shape
 *   - Hard redirects to /login on 401
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const session = await getSession();

    if (session?.accessToken) {
      config.headers.set('Authorization', `Bearer ${String(session.accessToken)}`);
    }
    if (session?.tenantId) {
      config.headers.set('x-tenant-id', String(session.tenantId));
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login';
        return Promise.reject(error);
      }
      const apiError: ApiError = error.response?.data as ApiError ?? {
        statusCode: error.response?.status ?? 0,
        message: error.message,
        error: 'Network Error',
        timestamp: new Date().toISOString(),
      };
      return Promise.reject(apiError);
    }
    return Promise.reject(error);
  },
);

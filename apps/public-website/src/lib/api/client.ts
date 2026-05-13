import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { ApiError } from '@/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api';

/** Public website API client — unauthenticated, no tenant header. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
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

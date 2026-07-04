import axios, { type AxiosInstance } from 'axios';
import { apiClient } from './client';

/**
 * Creates a service-specific API client while preserving
 * authentication, tenant context and error handling.
 */
function createServiceClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    ...apiClient.defaults,
    baseURL,
  });

  // Request interceptor
  client.interceptors.request.use(
    async (config) => {
      const req = await apiClient.interceptors.request.handlers[0]?.fulfilled?.(config);
      return req ?? config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const handler = apiClient.interceptors.response.handlers[0]?.rejected;
      return handler ? handler(error) : Promise.reject(error);
    },
  );

  return client;
}

const BOOKING_BASE =
  process.env['NEXT_PUBLIC_BOOKING_URL'] ??
  'https://booking-api.spancle.com';

const REPORTING_BASE =
  process.env['NEXT_PUBLIC_REPORTING_URL'] ??
  'https://reporting-api.spancle.com';

export const bookingApi = createServiceClient(BOOKING_BASE);

export const reportingApi = createServiceClient(REPORTING_BASE);

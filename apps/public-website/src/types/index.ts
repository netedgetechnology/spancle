export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

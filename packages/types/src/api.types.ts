import { z } from 'zod';

/**
 * API transport types — used by api-sdk clients.
 */

export interface RequestConfig {
  tenantId?:       string;
  accessToken?:    string;
  idempotencyKey?: string;
  timeout?:        number;
  signal?:         AbortSignal;
}

export const ApiErrorSchema = z.object({
  success:    z.literal(false),
  statusCode: z.number(),
  error:      z.string(),
  message:    z.union([z.string(), z.array(z.string())]),
  timestamp:  z.string(),
  path:       z.string().optional(),
  details:    z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export class SpancleApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode:  string;
  public readonly details?:   Record<string, string[]>;
  public readonly timestamp:  string;

  constructor(payload: ApiError) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message;
    super(message);
    this.name        = 'SpancleApiError';
    this.statusCode  = payload.statusCode;
    this.errorCode   = payload.error;
    this.details     = payload.details;
    this.timestamp   = payload.timestamp;
  }

  isUnauthorized(): boolean { return this.statusCode === 401; }
  isForbidden():    boolean { return this.statusCode === 403; }
  isNotFound():     boolean { return this.statusCode === 404; }
  isValidation():   boolean { return this.statusCode === 422; }
  isRateLimit():    boolean { return this.statusCode === 429; }
  isServerError():  boolean { return this.statusCode >= 500; }
}

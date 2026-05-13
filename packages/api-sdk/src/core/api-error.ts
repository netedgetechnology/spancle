import { z } from 'zod';

/**
 * SpancleApiError — typed error thrown by all SDK clients.
 *
 * Normalises every possible HTTP failure (network, 4xx, 5xx, timeout)
 * into a structured, predictable error object that callers can
 * pattern-match on without inspecting raw axios errors.
 */

export const ApiErrorPayloadSchema = z.object({
  statusCode: z.number(),
  error:      z.string(),
  message:    z.union([z.string(), z.array(z.string())]),
  timestamp:  z.string(),
  path:       z.string().optional(),
  details:    z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;

export class SpancleApiError extends Error {
  public readonly statusCode:  number;
  public readonly errorCode:   string;
  public readonly messages:    string[];
  public readonly details?:    Record<string, string[]>;
  public readonly timestamp:   string;
  public readonly path?:       string;
  public readonly isApiError = true as const;

  constructor(payload: ApiErrorPayload) {
    const messages = Array.isArray(payload.message)
      ? payload.message
      : [payload.message];

    super(messages.join('; '));

    this.name       = 'SpancleApiError';
    this.statusCode = payload.statusCode;
    this.errorCode  = payload.error;
    this.messages   = messages;
    this.details    = payload.details;
    this.timestamp  = payload.timestamp;
    this.path       = payload.path;
  }

  // ── Semantic helpers ───────────────────────────────────────────────────────

  isBadRequest():        boolean { return this.statusCode === 400; }
  isUnauthorized():      boolean { return this.statusCode === 401; }
  isForbidden():         boolean { return this.statusCode === 403; }
  isNotFound():          boolean { return this.statusCode === 404; }
  isConflict():          boolean { return this.statusCode === 409; }
  isValidationError():   boolean { return this.statusCode === 422; }
  isRateLimited():       boolean { return this.statusCode === 429; }
  isServerError():       boolean { return this.statusCode >= 500; }
  isNetworkError():      boolean { return this.statusCode === 0; }

  /**
   * Returns field-level validation errors if this is a 422 response.
   * Key: field path. Value: array of error messages.
   */
  getFieldErrors(): Record<string, string[]> {
    return this.details ?? {};
  }

  /**
   * Returns the first message string — safe to display to end users
   * for non-5xx errors.
   */
  getUserMessage(): string {
    return this.messages[0] ?? 'An unexpected error occurred';
  }

  override toString(): string {
    return `SpancleApiError[${this.statusCode}] ${this.errorCode}: ${this.message}`;
  }
}

/**
 * Type guard — narrows unknown catch variable to SpancleApiError.
 */
export function isSpancleApiError(error: unknown): error is SpancleApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isApiError' in error &&
    (error as SpancleApiError).isApiError === true
  );
}

/**
 * Normalises any thrown value into a SpancleApiError.
 * Used inside catch blocks throughout the SDK.
 */
export function normaliseError(error: unknown): SpancleApiError {
  if (isSpancleApiError(error)) return error;

  // Axios error with a response body
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosError = error as {
      response?: { status: number; data: unknown };
      message:   string;
    };

    if (axiosError.response) {
      const parsed = ApiErrorPayloadSchema.safeParse(axiosError.response.data);
      if (parsed.success) {
        return new SpancleApiError(parsed.data);
      }
      return new SpancleApiError({
        statusCode: axiosError.response.status,
        error:      'UnknownError',
        message:    axiosError.message,
        timestamp:  new Date().toISOString(),
      });
    }
  }

  // Network / timeout error (no response)
  const message = error instanceof Error ? error.message : 'Network error';
  return new SpancleApiError({
    statusCode: 0,
    error:      'NetworkError',
    message,
    timestamp:  new Date().toISOString(),
  });
}

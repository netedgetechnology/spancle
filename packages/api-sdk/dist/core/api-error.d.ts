import { z } from 'zod';
/**
 * SpancleApiError — typed error thrown by all SDK clients.
 *
 * Normalises every possible HTTP failure (network, 4xx, 5xx, timeout)
 * into a structured, predictable error object that callers can
 * pattern-match on without inspecting raw axios errors.
 */
export declare const ApiErrorPayloadSchema: z.ZodObject<{
    statusCode: z.ZodNumber;
    error: z.ZodString;
    message: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    timestamp: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    message: string | string[];
    statusCode: number;
    error: string;
    timestamp: string;
    path?: string | undefined;
    details?: Record<string, string[]> | undefined;
}, {
    message: string | string[];
    statusCode: number;
    error: string;
    timestamp: string;
    path?: string | undefined;
    details?: Record<string, string[]> | undefined;
}>;
export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;
export declare class SpancleApiError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly messages: string[];
    readonly details?: Record<string, string[]>;
    readonly timestamp: string;
    readonly path?: string;
    readonly isApiError: true;
    constructor(payload: ApiErrorPayload);
    isBadRequest(): boolean;
    isUnauthorized(): boolean;
    isForbidden(): boolean;
    isNotFound(): boolean;
    isConflict(): boolean;
    isValidationError(): boolean;
    isRateLimited(): boolean;
    isServerError(): boolean;
    isNetworkError(): boolean;
    /**
     * Returns field-level validation errors if this is a 422 response.
     * Key: field path. Value: array of error messages.
     */
    getFieldErrors(): Record<string, string[]>;
    /**
     * Returns the first message string — safe to display to end users
     * for non-5xx errors.
     */
    getUserMessage(): string;
    toString(): string;
}
/**
 * Type guard — narrows unknown catch variable to SpancleApiError.
 */
export declare function isSpancleApiError(error: unknown): error is SpancleApiError;
/**
 * Normalises any thrown value into a SpancleApiError.
 * Used inside catch blocks throughout the SDK.
 */
export declare function normaliseError(error: unknown): SpancleApiError;
//# sourceMappingURL=api-error.d.ts.map
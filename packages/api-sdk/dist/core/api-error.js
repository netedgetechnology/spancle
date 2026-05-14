"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpancleApiError = exports.ApiErrorPayloadSchema = void 0;
exports.isSpancleApiError = isSpancleApiError;
exports.normaliseError = normaliseError;
const zod_1 = require("zod");
/**
 * SpancleApiError — typed error thrown by all SDK clients.
 *
 * Normalises every possible HTTP failure (network, 4xx, 5xx, timeout)
 * into a structured, predictable error object that callers can
 * pattern-match on without inspecting raw axios errors.
 */
exports.ApiErrorPayloadSchema = zod_1.z.object({
    statusCode: zod_1.z.number(),
    error: zod_1.z.string(),
    message: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    timestamp: zod_1.z.string(),
    path: zod_1.z.string().optional(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
});
class SpancleApiError extends Error {
    constructor(payload) {
        const messages = Array.isArray(payload.message)
            ? payload.message
            : [payload.message];
        super(messages.join('; '));
        this.isApiError = true;
        this.name = 'SpancleApiError';
        this.statusCode = payload.statusCode;
        this.errorCode = payload.error;
        this.messages = messages;
        this.details = payload.details;
        this.timestamp = payload.timestamp;
        this.path = payload.path;
    }
    // ── Semantic helpers ───────────────────────────────────────────────────────
    isBadRequest() { return this.statusCode === 400; }
    isUnauthorized() { return this.statusCode === 401; }
    isForbidden() { return this.statusCode === 403; }
    isNotFound() { return this.statusCode === 404; }
    isConflict() { return this.statusCode === 409; }
    isValidationError() { return this.statusCode === 422; }
    isRateLimited() { return this.statusCode === 429; }
    isServerError() { return this.statusCode >= 500; }
    isNetworkError() { return this.statusCode === 0; }
    /**
     * Returns field-level validation errors if this is a 422 response.
     * Key: field path. Value: array of error messages.
     */
    getFieldErrors() {
        return this.details ?? {};
    }
    /**
     * Returns the first message string — safe to display to end users
     * for non-5xx errors.
     */
    getUserMessage() {
        return this.messages[0] ?? 'An unexpected error occurred';
    }
    toString() {
        return `SpancleApiError[${this.statusCode}] ${this.errorCode}: ${this.message}`;
    }
}
exports.SpancleApiError = SpancleApiError;
/**
 * Type guard — narrows unknown catch variable to SpancleApiError.
 */
function isSpancleApiError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'isApiError' in error &&
        error.isApiError === true);
}
/**
 * Normalises any thrown value into a SpancleApiError.
 * Used inside catch blocks throughout the SDK.
 */
function normaliseError(error) {
    if (isSpancleApiError(error))
        return error;
    // Axios error with a response body
    if (typeof error === 'object' &&
        error !== null &&
        'response' in error) {
        const axiosError = error;
        if (axiosError.response) {
            const parsed = exports.ApiErrorPayloadSchema.safeParse(axiosError.response.data);
            if (parsed.success) {
                return new SpancleApiError(parsed.data);
            }
            return new SpancleApiError({
                statusCode: axiosError.response.status,
                error: 'UnknownError',
                message: axiosError.message,
                timestamp: new Date().toISOString(),
            });
        }
    }
    // Network / timeout error (no response)
    const message = error instanceof Error ? error.message : 'Network error';
    return new SpancleApiError({
        statusCode: 0,
        error: 'NetworkError',
        message,
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=api-error.js.map
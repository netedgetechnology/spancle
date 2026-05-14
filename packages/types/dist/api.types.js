"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpancleApiError = exports.ApiErrorSchema = void 0;
const zod_1 = require("zod");
exports.ApiErrorSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    statusCode: zod_1.z.number(),
    error: zod_1.z.string(),
    message: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    timestamp: zod_1.z.string(),
    path: zod_1.z.string().optional(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
});
class SpancleApiError extends Error {
    constructor(payload) {
        const message = Array.isArray(payload.message)
            ? payload.message.join(', ')
            : payload.message;
        super(message);
        this.name = 'SpancleApiError';
        this.statusCode = payload.statusCode;
        this.errorCode = payload.error;
        this.details = payload.details;
        this.timestamp = payload.timestamp;
    }
    isUnauthorized() { return this.statusCode === 401; }
    isForbidden() { return this.statusCode === 403; }
    isNotFound() { return this.statusCode === 404; }
    isValidation() { return this.statusCode === 422; }
    isRateLimit() { return this.statusCode === 429; }
    isServerError() { return this.statusCode >= 500; }
}
exports.SpancleApiError = SpancleApiError;
//# sourceMappingURL=api.types.js.map
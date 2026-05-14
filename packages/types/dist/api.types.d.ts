import { z } from 'zod';
/**
 * API transport types — used by api-sdk clients.
 */
export interface RequestConfig {
    tenantId?: string;
    accessToken?: string;
    idempotencyKey?: string;
    timeout?: number;
    signal?: AbortSignal;
}
export declare const ApiErrorSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    statusCode: z.ZodNumber;
    error: z.ZodString;
    message: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    timestamp: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    message: string | string[];
    success: false;
    statusCode: number;
    error: string;
    timestamp: string;
    path?: string | undefined;
    details?: Record<string, string[]> | undefined;
}, {
    message: string | string[];
    success: false;
    statusCode: number;
    error: string;
    timestamp: string;
    path?: string | undefined;
    details?: Record<string, string[]> | undefined;
}>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export declare class SpancleApiError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly details?: Record<string, string[]>;
    readonly timestamp: string;
    constructor(payload: ApiError);
    isUnauthorized(): boolean;
    isForbidden(): boolean;
    isNotFound(): boolean;
    isValidation(): boolean;
    isRateLimit(): boolean;
    isServerError(): boolean;
}
//# sourceMappingURL=api.types.d.ts.map
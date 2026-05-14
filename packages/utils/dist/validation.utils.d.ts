import { z } from 'zod';
/**
 * Runtime validation helpers wrapping Zod.
 */
export type ValidationResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    errors: Record<string, string[]>;
};
/**
 * Validates data against a Zod schema and returns a typed result.
 * Does not throw — returns structured errors instead.
 */
export declare function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T>;
/**
 * Type-guard: returns true if value is a non-null object.
 */
export declare function isObject(value: unknown): value is Record<string, unknown>;
/**
 * Type-guard: returns true if value is a valid UUID v4.
 */
export declare function isUuid(value: unknown): value is string;
/**
 * Checks if a string is a valid ISO 8601 date string.
 */
export declare function isIsoDate(value: unknown): value is string;
/**
 * Strips undefined and null values from an object (shallow).
 */
export declare function stripNullish<T extends Record<string, unknown>>(obj: T): Partial<T>;
//# sourceMappingURL=validation.utils.d.ts.map
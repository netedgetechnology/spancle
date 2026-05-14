"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.isObject = isObject;
exports.isUuid = isUuid;
exports.isIsoDate = isIsoDate;
exports.stripNullish = stripNullish;
/**
 * Validates data against a Zod schema and returns a typed result.
 * Does not throw — returns structured errors instead.
 */
function validate(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = {};
    for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_root';
        if (!errors[key])
            errors[key] = [];
        errors[key].push(issue.message);
    }
    return { success: false, errors };
}
/**
 * Type-guard: returns true if value is a non-null object.
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Type-guard: returns true if value is a valid UUID v4.
 */
function isUuid(value) {
    if (typeof value !== 'string')
        return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
/**
 * Checks if a string is a valid ISO 8601 date string.
 */
function isIsoDate(value) {
    if (typeof value !== 'string')
        return false;
    const d = new Date(value);
    return !isNaN(d.getTime()) && value.includes('T');
}
/**
 * Strips undefined and null values from an object (shallow).
 */
function stripNullish(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}
//# sourceMappingURL=validation.utils.js.map
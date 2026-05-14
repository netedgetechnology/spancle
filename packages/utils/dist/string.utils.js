"use strict";
/**
 * String utilities — pure functions, no dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTitleCase = toTitleCase;
exports.toKebabCase = toKebabCase;
exports.toCamelCase = toCamelCase;
exports.truncate = truncate;
exports.toSlug = toSlug;
exports.maskEmail = maskEmail;
exports.maskPhone = maskPhone;
exports.getInitials = getInitials;
exports.interpolate = interpolate;
exports.generateRef = generateRef;
/** Converts 'hello world' to 'Hello World' */
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
/** Converts 'camelCase' or 'PascalCase' to 'kebab-case' */
function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/\s+/g, '-')
        .toLowerCase();
}
/** Converts 'kebab-case' or 'snake_case' to 'camelCase' */
function toCamelCase(str) {
    return str
        .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (m) => m.toLowerCase());
}
/** Truncates string to maxLength with ellipsis */
function truncate(str, maxLength, ellipsis = '...') {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}
/** Generates a URL-friendly slug from a string */
function toSlug(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
/** Masks an email for safe display/logging: user@domain.com -> us**@domain.com */
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!local || !domain)
        return '***@***.***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}
/** Masks a phone number: +447700900123 -> +44*****0123 */
function maskPhone(phone) {
    if (phone.length < 6)
        return '***';
    return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
}
/** Returns initials from a full name: 'John Doe' -> 'JD' */
function getInitials(name, max = 2) {
    return name
        .split(/\s+/)
        .slice(0, max)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}
/** Interpolates template variables: 'Hello {{name}}!' + { name: 'Jo' } -> 'Hello Jo!' */
function interpolate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
/** Generates a simple alphanumeric reference code */
function generateRef(prefix, length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous: 0,O,1,I
    let result = prefix.toUpperCase() + '-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
//# sourceMappingURL=string.utils.js.map
/**
 * String utilities — pure functions, no dependencies.
 */
/** Converts 'hello world' to 'Hello World' */
export declare function toTitleCase(str: string): string;
/** Converts 'camelCase' or 'PascalCase' to 'kebab-case' */
export declare function toKebabCase(str: string): string;
/** Converts 'kebab-case' or 'snake_case' to 'camelCase' */
export declare function toCamelCase(str: string): string;
/** Truncates string to maxLength with ellipsis */
export declare function truncate(str: string, maxLength: number, ellipsis?: string): string;
/** Generates a URL-friendly slug from a string */
export declare function toSlug(str: string): string;
/** Masks an email for safe display/logging: user@domain.com -> us**@domain.com */
export declare function maskEmail(email: string): string;
/** Masks a phone number: +447700900123 -> +44*****0123 */
export declare function maskPhone(phone: string): string;
/** Returns initials from a full name: 'John Doe' -> 'JD' */
export declare function getInitials(name: string, max?: number): string;
/** Interpolates template variables: 'Hello {{name}}!' + { name: 'Jo' } -> 'Hello Jo!' */
export declare function interpolate(template: string, vars: Record<string, string>): string;
/** Generates a simple alphanumeric reference code */
export declare function generateRef(prefix: string, length?: number): string;
//# sourceMappingURL=string.utils.d.ts.map
/**
 * String utilities — pure functions, no dependencies.
 */

/** Converts 'hello world' to 'Hello World' */
export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

/** Converts 'camelCase' or 'PascalCase' to 'kebab-case' */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/** Converts 'kebab-case' or 'snake_case' to 'camelCase' */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (m) => m.toLowerCase());
}

/** Truncates string to maxLength with ellipsis */
export function truncate(str: string, maxLength: number, ellipsis = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/** Generates a URL-friendly slug from a string */
export function toSlug(str: string): string {
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
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

/** Masks a phone number: +447700900123 -> +44*****0123 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
}

/** Returns initials from a full name: 'John Doe' -> 'JD' */
export function getInitials(name: string, max = 2): string {
  return name
    .split(/\s+/)
    .slice(0, max)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Interpolates template variables: 'Hello {{name}}!' + { name: 'Jo' } -> 'Hello Jo!' */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

/** Generates a simple alphanumeric reference code */
export function generateRef(prefix: string, length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous: 0,O,1,I
  let result = prefix.toUpperCase() + '-';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

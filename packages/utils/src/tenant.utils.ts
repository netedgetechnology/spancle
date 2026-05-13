/**
 * Tenant utility helpers — used by both backend services and frontend apps.
 */

/**
 * Extracts tenant slug from a hostname.
 * acme.app.spancle.io -> 'acme'
 * app.spancle.io -> null
 */
export function extractTenantSlug(
  hostname: string,
  baseDomain: string,
): string | null {
  const withoutBase = hostname.replace(`.${baseDomain}`, '');
  if (withoutBase === hostname) return null; // no subdomain match
  if (withoutBase === 'www') return null;
  return withoutBase;
}

/**
 * Builds a tenant-namespaced Redis key.
 * Pattern: spancle:{tenantId}:{domain}:{id}
 */
export function tenantRedisKey(
  tenantId: string,
  domain: string,
  id: string,
): string {
  return `spancle:${tenantId}:${domain}:${id}`;
}

/**
 * Type guard — asserts tenantId is present on a request-like object.
 */
export function hasTenantId(
  obj: unknown,
): obj is { tenantId: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'tenantId' in obj &&
    typeof (obj as Record<string, unknown>)['tenantId'] === 'string'
  );
}

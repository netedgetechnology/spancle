/**
 * platform-version-compatibility.ts
 *
 * Version compatibility helpers for platform contract consumers.
 *
 * A consumer reads the envelope's contractVersion and calls
 * isVersionCompatible() before deserializing the payload.
 * Incompatible major versions must be dead-lettered, not processed.
 */

export const PLATFORM_SCHEMA_CURRENT_VERSION   = '1.0.0' as const;
export const PLATFORM_SCHEMA_SUPPORTED_VERSIONS = ['1.0.0'] as const;
export const PLATFORM_SCHEMA_DEPRECATED_VERSIONS: string[] = [];

export type SupportedPlatformSchemaVersion =
  typeof PLATFORM_SCHEMA_SUPPORTED_VERSIONS[number];

/**
 * Returns true when the received semver is compatible with the current
 * platform schema: same major version, any minor/patch.
 */
export function isPlatformVersionCompatible(received: string): boolean {
  const [rMajor] = received.split('.');
  const [cMajor] = PLATFORM_SCHEMA_CURRENT_VERSION.split('.');
  return rMajor === cMajor;
}

export function isPlatformVersionSupported(received: string): boolean {
  return (PLATFORM_SCHEMA_SUPPORTED_VERSIONS as readonly string[]).includes(received);
}

export function isPlatformVersionDeprecated(received: string): boolean {
  return PLATFORM_SCHEMA_DEPRECATED_VERSIONS.includes(received);
}

export type VersionCompatibilityResult =
  | { compatible: true;  deprecated: boolean; reason?: never }
  | { compatible: false; deprecated: false;   reason: string };

export function checkPlatformVersionCompatibility(
  received: string,
): VersionCompatibilityResult {
  if (!isPlatformVersionCompatible(received)) {
    return {
      compatible: false,
      deprecated: false,
      reason: `Schema version "${received}" is incompatible with current "${PLATFORM_SCHEMA_CURRENT_VERSION}" (major version mismatch)`,
    };
  }
  return { compatible: true, deprecated: isPlatformVersionDeprecated(received) };
}

/**
 * Contract-level version compatibility (payload schema, not envelope schema).
 * Uses same-major rule.
 */
export function isContractVersionCompatible(
  received:         string,
  currentVersion:   string,
): boolean {
  const [rMajor] = received.split('.');
  const [cMajor] = currentVersion.split('.');
  return rMajor === cMajor;
}

/**
 * contract-version.ts
 *
 * Authoritative version constants for Commercial→Finance inter-module contracts.
 *
 * Versioning rules:
 *   PATCH: additive-only changes (new optional fields)
 *   MINOR: new optional sections added
 *   MAJOR: breaking field removal or type change — requires Finance migration
 *
 * Finance consumers MUST check contractVersion before reading instruction fields.
 * Unknown versions must be dead-lettered, not silently processed.
 *
 * Current version: 1.0.0
 */

export const COMMERCIAL_CONTRACT_VERSION = '1.0.0' as const;
export type CommercialContractVersion = typeof COMMERCIAL_CONTRACT_VERSION;

/**
 * Checks whether a received contract version is compatible with the current
 * version. v1.x.x is backward-compatible with 1.0.0 (same major).
 */
export function isCompatibleVersion(received: string): boolean {
  const [rMajor] = received.split('.');
  const [cMajor] = COMMERCIAL_CONTRACT_VERSION.split('.');
  return rMajor === cMajor;
}

/**
 * Base fields present on every versioned contract object.
 * Finance consumers read contractVersion before deserializing.
 */
export interface VersionedContract {
  /** Semver string. Increment MAJOR on breaking change. */
  readonly contractVersion: CommercialContractVersion;
  /** ISO-8601 timestamp when this contract was generated. */
  readonly generatedAt: string;
}

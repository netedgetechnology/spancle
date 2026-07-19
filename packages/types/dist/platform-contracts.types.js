"use strict";
/**
 * platform-contracts.types.ts
 *
 * Shared type definitions for SPANCLE Platform Contracts.
 *
 * These are the immutable contract shapes produced by the Commercial Engine
 * and consumed by Finance (and future services).
 *
 * Rules:
 *   - Pure TypeScript interfaces only. No runtime values.
 *   - No imports from any service package.
 *   - All monetary values: INT minor currency units.
 *   - All rates: INT basis points (100 bps = 1%).
 *   - All dates: ISO-8601 strings.
 *
 * Contract version: 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_CONTRACT_VERSION = void 0;
exports.isPlatformContractVersionCompatible = isPlatformContractVersionCompatible;
// ── Versioning ────────────────────────────────────────────────────────────────
exports.PLATFORM_CONTRACT_VERSION = '1.0.0';
function isPlatformContractVersionCompatible(received) {
    const [rMajor] = received.split('.');
    const [cMajor] = exports.PLATFORM_CONTRACT_VERSION.split('.');
    return rMajor === cMajor;
}
//# sourceMappingURL=platform-contracts.types.js.map
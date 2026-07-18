"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_SCHEMA_DEPRECATED_VERSIONS = exports.PLATFORM_SCHEMA_SUPPORTED_VERSIONS = exports.PLATFORM_SCHEMA_CURRENT_VERSION = void 0;
exports.isPlatformVersionCompatible = isPlatformVersionCompatible;
exports.isPlatformVersionSupported = isPlatformVersionSupported;
exports.isPlatformVersionDeprecated = isPlatformVersionDeprecated;
exports.checkPlatformVersionCompatibility = checkPlatformVersionCompatibility;
exports.isContractVersionCompatible = isContractVersionCompatible;
exports.PLATFORM_SCHEMA_CURRENT_VERSION = '1.0.0';
exports.PLATFORM_SCHEMA_SUPPORTED_VERSIONS = ['1.0.0'];
exports.PLATFORM_SCHEMA_DEPRECATED_VERSIONS = [];
function isPlatformVersionCompatible(received) {
    const [rMajor] = received.split('.');
    const [cMajor] = exports.PLATFORM_SCHEMA_CURRENT_VERSION.split('.');
    return rMajor === cMajor;
}
function isPlatformVersionSupported(received) {
    return exports.PLATFORM_SCHEMA_SUPPORTED_VERSIONS.includes(received);
}
function isPlatformVersionDeprecated(received) {
    return exports.PLATFORM_SCHEMA_DEPRECATED_VERSIONS.includes(received);
}
function checkPlatformVersionCompatibility(received) {
    if (!isPlatformVersionCompatible(received)) {
        return {
            compatible: false,
            deprecated: false,
            reason: `Schema version "${received}" is incompatible with current "${exports.PLATFORM_SCHEMA_CURRENT_VERSION}" (major version mismatch)`,
        };
    }
    return { compatible: true, deprecated: isPlatformVersionDeprecated(received) };
}
function isContractVersionCompatible(received, currentVersion) {
    const [rMajor] = received.split('.');
    const [cMajor] = currentVersion.split('.');
    return rMajor === cMajor;
}
//# sourceMappingURL=platform-version-compatibility.js.map
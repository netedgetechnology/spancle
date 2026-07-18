"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMERCIAL_CONTRACT_VERSION = void 0;
exports.isCompatibleVersion = isCompatibleVersion;
exports.COMMERCIAL_CONTRACT_VERSION = '1.0.0';
function isCompatibleVersion(received) {
    const [rMajor] = received.split('.');
    const [cMajor] = exports.COMMERCIAL_CONTRACT_VERSION.split('.');
    return rMajor === cMajor;
}
//# sourceMappingURL=contract-version.js.map
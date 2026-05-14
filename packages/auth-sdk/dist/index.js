"use strict";
/**
 * @spancle/auth-sdk — Auth helpers, RBAC engine and token utilities.
 *
 * Dependency chain: constants -> types -> auth-sdk
 * No HTTP, no database, no framework imports.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./token/token.types"), exports);
__exportStar(require("./token/token.utils"), exports);
__exportStar(require("./rbac/rbac.types"), exports);
__exportStar(require("./rbac/rbac.constants"), exports);
__exportStar(require("./rbac/rbac.engine"), exports);
__exportStar(require("./tenant/tenant-context"), exports);
__exportStar(require("./schemas/auth.schemas"), exports);
//# sourceMappingURL=index.js.map
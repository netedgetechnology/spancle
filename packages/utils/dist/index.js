"use strict";
/**
 * @spancle/utils — Shared pure utility functions.
 *
 * Safe for Node.js and browser environments except crypto.utils
 * which requires the Node.js crypto module.
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
__exportStar(require("./date.utils"), exports);
__exportStar(require("./string.utils"), exports);
__exportStar(require("./number.utils"), exports);
__exportStar(require("./validation.utils"), exports);
__exportStar(require("./pagination.utils"), exports);
__exportStar(require("./tenant.utils"), exports);
// crypto.utils exported separately — Node-only
__exportStar(require("./crypto.utils"), exports);
//# sourceMappingURL=index.js.map
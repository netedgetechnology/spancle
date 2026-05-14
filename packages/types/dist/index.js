"use strict";
/**
 * @spancle/types — Single source of truth for all shared TypeScript types.
 *
 * Dependency rule: this package depends only on 'zod'.
 * No service-specific or framework imports allowed.
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
__exportStar(require("./common.types"), exports);
__exportStar(require("./tenant.types"), exports);
__exportStar(require("./identity.types"), exports);
__exportStar(require("./user.types"), exports);
__exportStar(require("./role.types"), exports);
__exportStar(require("./booking.types"), exports);
__exportStar(require("./finance.types"), exports);
__exportStar(require("./tournament.types"), exports);
__exportStar(require("./academy.types"), exports);
__exportStar(require("./communication.types"), exports);
__exportStar(require("./reporting.types"), exports);
__exportStar(require("./api.types"), exports);
//# sourceMappingURL=index.js.map
"use strict";
/**
 * @spancle/event-contracts — Typed event schemas for all Redis Pub/Sub channels.
 *
 * Rules:
 *   - All events MUST use EventEnvelope as outer wrapper
 *   - All payload schemas are Zod schemas — validate on both produce and consume
 *   - EventRegistry is the single source of truth for channel names
 *   - Never publish or subscribe using raw strings — always use EventRegistry.*
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
__exportStar(require("./core/event-envelope"), exports);
__exportStar(require("./core/event-registry"), exports);
__exportStar(require("./domains/identity.events"), exports);
__exportStar(require("./domains/tenant.events"), exports);
__exportStar(require("./domains/booking.events"), exports);
__exportStar(require("./domains/finance.events"), exports);
__exportStar(require("./domains/tournament.events"), exports);
__exportStar(require("./domains/academy.events"), exports);
__exportStar(require("./domains/communication.events"), exports);
__exportStar(require("./domains/reporting.events"), exports);
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACADEMY_EVENT_SCHEMAS = exports.PlayerLevelChangedPayloadSchema = exports.PlayerRegisteredPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
exports.PlayerRegisteredPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    playerId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    academyId: zod_1.z.string().uuid(),
    sport: zod_1.z.string(),
    level: zod_1.z.string(),
    joinDate: zod_1.z.string().date().optional(),
});
exports.PlayerLevelChangedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    playerId: zod_1.z.string().uuid(),
    previousLevel: zod_1.z.string(),
    newLevel: zod_1.z.string(),
    changedBy: zod_1.z.string().uuid(),
});
exports.ACADEMY_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.PLAYER_REGISTERED]: exports.PlayerRegisteredPayloadSchema,
    [event_registry_1.EventRegistry.PLAYER_LEVEL_CHANGED]: exports.PlayerLevelChangedPayloadSchema,
};
//# sourceMappingURL=academy.events.js.map
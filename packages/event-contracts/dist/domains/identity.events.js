"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDENTITY_EVENT_SCHEMAS = exports.IdentityCreatedPayloadSchema = exports.AccountLockedPayloadSchema = exports.PasswordChangedPayloadSchema = exports.LoginFailedPayloadSchema = exports.LoginSuccessPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
// ── Schemas ───────────────────────────────────────────────────────────────────
const BaseIdentityPayload = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
});
exports.LoginSuccessPayloadSchema = BaseIdentityPayload.extend({
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
});
exports.LoginFailedPayloadSchema = BaseIdentityPayload.extend({
    reason: zod_1.z.string(),
    attemptCount: zod_1.z.number().int().min(1),
    ipAddress: zod_1.z.string().optional(),
});
exports.PasswordChangedPayloadSchema = BaseIdentityPayload.extend({
    changedBy: zod_1.z.string().uuid(),
    triggeredBy: zod_1.z.enum(['user', 'admin', 'reset_flow']),
});
exports.AccountLockedPayloadSchema = BaseIdentityPayload.extend({
    lockedUntil: zod_1.z.string().datetime(),
    reason: zod_1.z.string(),
    attemptCount: zod_1.z.number().int(),
});
exports.IdentityCreatedPayloadSchema = BaseIdentityPayload.extend({
    email: zod_1.z.string().email(),
    createdBy: zod_1.z.string().uuid().optional(),
});
// ── Channel map ───────────────────────────────────────────────────────────────
exports.IDENTITY_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.IDENTITY_LOGIN_SUCCESS]: exports.LoginSuccessPayloadSchema,
    [event_registry_1.EventRegistry.IDENTITY_LOGIN_FAILED]: exports.LoginFailedPayloadSchema,
    [event_registry_1.EventRegistry.IDENTITY_PASSWORD_CHANGED]: exports.PasswordChangedPayloadSchema,
    [event_registry_1.EventRegistry.IDENTITY_ACCOUNT_LOCKED]: exports.AccountLockedPayloadSchema,
    [event_registry_1.EventRegistry.IDENTITY_CREATED]: exports.IdentityCreatedPayloadSchema,
};
//# sourceMappingURL=identity.events.js.map
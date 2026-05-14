"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOURNAMENT_EVENT_SCHEMAS = exports.MatchCompletedPayloadSchema = exports.TournamentCreatedPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
const BaseTournamentPayload = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    tournamentId: zod_1.z.string().uuid(),
});
exports.TournamentCreatedPayloadSchema = BaseTournamentPayload.extend({
    name: zod_1.z.string(),
    format: zod_1.z.string(),
    sport: zod_1.z.string(),
    startDate: zod_1.z.string().date(),
});
exports.MatchCompletedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    matchId: zod_1.z.string().uuid(),
    tournamentId: zod_1.z.string().uuid(),
    homeTeamId: zod_1.z.string().uuid(),
    awayTeamId: zod_1.z.string().uuid(),
    homeScore: zod_1.z.number().int().min(0),
    awayScore: zod_1.z.number().int().min(0),
    winnerId: zod_1.z.string().uuid().nullable(),
    completedAt: zod_1.z.string().datetime(),
});
exports.TOURNAMENT_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.TOURNAMENT_CREATED]: exports.TournamentCreatedPayloadSchema,
    [event_registry_1.EventRegistry.TOURNAMENT_STARTED]: BaseTournamentPayload,
    [event_registry_1.EventRegistry.TOURNAMENT_COMPLETED]: BaseTournamentPayload,
    [event_registry_1.EventRegistry.MATCH_COMPLETED]: exports.MatchCompletedPayloadSchema,
};
//# sourceMappingURL=tournament.events.js.map
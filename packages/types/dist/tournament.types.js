"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTournamentSchema = exports.MatchStatusSchema = exports.TournamentFormatSchema = exports.TournamentStatusSchema = void 0;
const zod_1 = require("zod");
exports.TournamentStatusSchema = zod_1.z.enum([
    'draft', 'registration', 'in_progress', 'completed', 'cancelled',
]);
exports.TournamentFormatSchema = zod_1.z.enum([
    'single_elimination', 'double_elimination', 'round_robin',
    'swiss', 'league', 'group_stage',
]);
exports.MatchStatusSchema = zod_1.z.enum([
    'scheduled', 'in_progress', 'completed', 'forfeit', 'postponed',
]);
exports.CreateTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200),
    format: exports.TournamentFormatSchema,
    sport: zod_1.z.string().max(50),
    maxTeams: zod_1.z.number().int().positive().max(256),
    startDate: zod_1.z.string().date(),
    endDate: zod_1.z.string().date(),
    venueId: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().max(2000).optional(),
    rules: zod_1.z.string().max(5000).optional(),
});
//# sourceMappingURL=tournament.types.js.map
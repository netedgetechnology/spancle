"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateReportSchema = exports.ReportFormatSchema = exports.ReportStatusSchema = exports.ReportTypeSchema = void 0;
const zod_1 = require("zod");
exports.ReportTypeSchema = zod_1.z.enum([
    'bookings_summary', 'revenue', 'player_activity',
    'tournament_results', 'attendance', 'custom',
]);
exports.ReportStatusSchema = zod_1.z.enum([
    'pending', 'processing', 'completed', 'failed',
]);
exports.ReportFormatSchema = zod_1.z.enum(['json', 'csv', 'pdf', 'xlsx']);
exports.CreateReportSchema = zod_1.z.object({
    type: exports.ReportTypeSchema,
    format: exports.ReportFormatSchema.default('json'),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    dateFrom: zod_1.z.string().date(),
    dateTo: zod_1.z.string().date(),
    name: zod_1.z.string().max(200).optional(),
});
//# sourceMappingURL=reporting.types.js.map
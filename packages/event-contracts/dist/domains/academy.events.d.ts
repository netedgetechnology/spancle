import { z } from 'zod';
export declare const PlayerRegisteredPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    playerId: z.ZodString;
    userId: z.ZodString;
    academyId: z.ZodString;
    sport: z.ZodString;
    level: z.ZodString;
    joinDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    sport: string;
    playerId: string;
    academyId: string;
    level: string;
    joinDate?: string | undefined;
}, {
    tenantId: string;
    userId: string;
    sport: string;
    playerId: string;
    academyId: string;
    level: string;
    joinDate?: string | undefined;
}>;
export declare const PlayerLevelChangedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    playerId: z.ZodString;
    previousLevel: z.ZodString;
    newLevel: z.ZodString;
    changedBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    changedBy: string;
    playerId: string;
    previousLevel: string;
    newLevel: string;
}, {
    tenantId: string;
    changedBy: string;
    playerId: string;
    previousLevel: string;
    newLevel: string;
}>;
export type PlayerRegisteredPayload = z.infer<typeof PlayerRegisteredPayloadSchema>;
export type PlayerLevelChangedPayload = z.infer<typeof PlayerLevelChangedPayloadSchema>;
export declare const ACADEMY_EVENT_SCHEMAS: {
    readonly "spancle.player.registered": z.ZodObject<{
        tenantId: z.ZodString;
        playerId: z.ZodString;
        userId: z.ZodString;
        academyId: z.ZodString;
        sport: z.ZodString;
        level: z.ZodString;
        joinDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        sport: string;
        playerId: string;
        academyId: string;
        level: string;
        joinDate?: string | undefined;
    }, {
        tenantId: string;
        userId: string;
        sport: string;
        playerId: string;
        academyId: string;
        level: string;
        joinDate?: string | undefined;
    }>;
    readonly "spancle.player.level_changed": z.ZodObject<{
        tenantId: z.ZodString;
        playerId: z.ZodString;
        previousLevel: z.ZodString;
        newLevel: z.ZodString;
        changedBy: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        changedBy: string;
        playerId: string;
        previousLevel: string;
        newLevel: string;
    }, {
        tenantId: string;
        changedBy: string;
        playerId: string;
        previousLevel: string;
        newLevel: string;
    }>;
};
//# sourceMappingURL=academy.events.d.ts.map
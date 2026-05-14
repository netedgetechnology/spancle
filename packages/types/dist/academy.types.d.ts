import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const PlayerLevelSchema: z.ZodEnum<["beginner", "intermediate", "advanced", "elite", "professional"]>;
export type PlayerLevel = z.infer<typeof PlayerLevelSchema>;
export declare const CoachLicenseSchema: z.ZodEnum<["none", "level_1", "level_2", "level_3", "pro", "elite"]>;
export type CoachLicense = z.infer<typeof CoachLicenseSchema>;
export declare const PlayerStatusSchema: z.ZodEnum<["prospect", "registered", "active", "inactive", "suspended", "graduated"]>;
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;
export declare const CreatePlayerSchema: z.ZodObject<{
    userId: z.ZodString;
    academyId: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["beginner", "intermediate", "advanced", "elite", "professional"]>>;
    position: z.ZodOptional<z.ZodString>;
    jerseyNumber: z.ZodOptional<z.ZodNumber>;
    sport: z.ZodString;
    joinDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    academyId: string;
    level: "beginner" | "intermediate" | "advanced" | "elite" | "professional";
    sport: string;
    position?: string | undefined;
    jerseyNumber?: number | undefined;
    joinDate?: string | undefined;
}, {
    userId: string;
    academyId: string;
    sport: string;
    level?: "beginner" | "intermediate" | "advanced" | "elite" | "professional" | undefined;
    position?: string | undefined;
    jerseyNumber?: number | undefined;
    joinDate?: string | undefined;
}>;
export type CreatePlayerDto = z.infer<typeof CreatePlayerSchema>;
export declare const CreateCoachSchema: z.ZodObject<{
    userId: z.ZodString;
    academyId: z.ZodString;
    license: z.ZodDefault<z.ZodEnum<["none", "level_1", "level_2", "level_3", "pro", "elite"]>>;
    speciality: z.ZodOptional<z.ZodString>;
    sports: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    userId: string;
    academyId: string;
    license: "none" | "elite" | "level_1" | "level_2" | "level_3" | "pro";
    sports: string[];
    speciality?: string | undefined;
}, {
    userId: string;
    academyId: string;
    sports: string[];
    license?: "none" | "elite" | "level_1" | "level_2" | "level_3" | "pro" | undefined;
    speciality?: string | undefined;
}>;
export type CreateCoachDto = z.infer<typeof CreateCoachSchema>;
export interface Academy extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    name: string;
    description?: string;
    sport: string;
    isActive: boolean;
    isDeleted: boolean;
}
export interface Player extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    userId: UUID;
    academyId: UUID;
    level: PlayerLevel;
    status: PlayerStatus;
    position?: string;
    jerseyNumber?: number;
    sport: string;
    joinDate?: Date;
    isDeleted: boolean;
}
//# sourceMappingURL=academy.types.d.ts.map
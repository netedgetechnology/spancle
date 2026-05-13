import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsObject,
  IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

/**
 * GenerateSlotsDto — input for bulk slot generation.
 *
 * Two modes:
 *   1. templateId provided → generate from a SlotTemplate's configuration
 *   2. No templateId       → use the fields directly (ad-hoc generation)
 *
 * In both modes, startDate/endDate defines the date range to generate.
 */
export class GenerateSlotsDto {
  @IsUUID()
  courtId!: string;

  /** ISO date string (YYYY-MM-DD) — generation starts from this date (inclusive) */
  @IsDateString()
  startDate!: string;

  /** ISO date string (YYYY-MM-DD) — generation ends on this date (inclusive, max 90d ahead) */
  @IsDateString()
  endDate!: string;

  /** If provided, uses SlotTemplate configuration instead of the fields below */
  @IsUUID()
  @IsOptional()
  templateId?: string;

  // ── Ad-hoc generation fields (ignored when templateId is provided) ─────────

  /**
   * Duration of each slot in minutes.
   * Must be a multiple of 15 (e.g. 30, 45, 60, 90, 120).
   */
  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  durationMins?: number;

  /** Gap between slots in minutes (cleaning / changeover time) */
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferMins?: number;

  /**
   * Override the court's operating hours for this generation run.
   * Format: { openTime: 'HH:MM', closeTime: 'HH:MM' }
   * If not provided, court/branch hours are used.
   */
  @IsObject()
  @IsOptional()
  hoursOverride?: { openTime: string; closeTime: string };

  /** If false, generated slots start as 'unavailable' (require manual publishing) */
  @IsBoolean()
  @IsOptional()
  autoPublish?: boolean;

  /** Skip generation on dates matching active holidays */
  @IsBoolean()
  @IsOptional()
  skipHolidays?: boolean;

  /** Skip generation on dates with active blackouts for this court/branch/tenant */
  @IsBoolean()
  @IsOptional()
  skipBlackouts?: boolean;
}

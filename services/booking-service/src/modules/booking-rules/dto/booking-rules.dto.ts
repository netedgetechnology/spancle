import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { BOOKING_RULE_SCOPES, type BookingRuleScope } from '../entities/booking-rules.entity';

export class CreateBookingRulesDto {
  @IsEnum(BOOKING_RULE_SCOPES)
  @IsOptional()
  scope?: BookingRuleScope;

  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @IsBoolean() @IsOptional()
  isActive?: boolean;

  // Advance booking
  @IsInt() @Min(0) @Max(525_600) @IsOptional()  // max 1 year in minutes
  maxAdvanceBookingMins?: number;

  @IsInt() @Min(0) @Max(10_080) @IsOptional()   // max 1 week
  minNoticeMins?: number;

  // Duration
  @IsInt() @Min(15) @Max(1_440) @IsOptional()
  minDurationMins?: number;

  @IsInt() @Min(15) @Max(1_440) @IsOptional()
  maxDurationMins?: number;

  // Limits
  @IsInt() @Min(1) @Max(100) @IsOptional()
  maxBookingsPerDay?: number;

  @IsInt() @Min(1) @Max(500) @IsOptional()
  maxBookingsPerWeek?: number;

  @IsInt() @Min(1) @Max(2_000) @IsOptional()
  maxBookingsPerMonth?: number;

  // Restrictions
  @IsBoolean() @IsOptional()
  membersOnly?: boolean;

  @IsInt() @Min(0) @Max(120) @IsOptional()
  minAgeYears?: number;

  @IsInt() @Min(0) @Max(120) @IsOptional()
  maxAgeYears?: number;

  // Buffer
  @IsInt() @Min(0) @Max(240) @IsOptional()
  bufferTimeMins?: number;

  // Cutoffs
  @IsInt() @Min(0) @Max(44_640) @IsOptional()   // max 31 days
  cancellationCutoffMins?: number;

  @IsInt() @Min(0) @Max(44_640) @IsOptional()
  rescheduleCutoffMins?: number;

  @IsInt() @Min(0) @Max(120) @IsOptional()
  gracePeriodMins?: number;

  // Blackout dates
  @IsArray() @IsString({ each: true }) @IsOptional()
  blackoutDates?: string[];
}

export class UpdateBookingRulesDto {
  @IsString() @IsNotEmpty() @MaxLength(150) @IsOptional()
  name?: string;

  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @IsBoolean() @IsOptional()
  isActive?: boolean;

  @IsInt() @Min(0) @Max(525_600) @IsOptional()
  maxAdvanceBookingMins?: number | null;

  @IsInt() @Min(0) @Max(10_080) @IsOptional()
  minNoticeMins?: number | null;

  @IsInt() @Min(15) @Max(1_440) @IsOptional()
  minDurationMins?: number | null;

  @IsInt() @Min(15) @Max(1_440) @IsOptional()
  maxDurationMins?: number | null;

  @IsInt() @Min(1) @Max(100) @IsOptional()
  maxBookingsPerDay?: number | null;

  @IsInt() @Min(1) @Max(500) @IsOptional()
  maxBookingsPerWeek?: number | null;

  @IsInt() @Min(1) @Max(2_000) @IsOptional()
  maxBookingsPerMonth?: number | null;

  @IsBoolean() @IsOptional()
  membersOnly?: boolean;

  @IsInt() @Min(0) @Max(120) @IsOptional()
  minAgeYears?: number | null;

  @IsInt() @Min(0) @Max(120) @IsOptional()
  maxAgeYears?: number | null;

  @IsInt() @Min(0) @Max(240) @IsOptional()
  bufferTimeMins?: number | null;

  @IsInt() @Min(0) @Max(44_640) @IsOptional()
  cancellationCutoffMins?: number | null;

  @IsInt() @Min(0) @Max(44_640) @IsOptional()
  rescheduleCutoffMins?: number | null;

  @IsInt() @Min(0) @Max(120) @IsOptional()
  gracePeriodMins?: number | null;

  @IsArray() @IsString({ each: true }) @IsOptional()
  blackoutDates?: string[] | null;
}

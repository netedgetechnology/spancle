import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { CourtSurface, IndoorOutdoor } from '../entities/court.entity';

const SURFACES: CourtSurface[] = [
  'grass', 'artificial_grass', 'hard_court', 'clay',
  'carpet', 'wood', 'rubber', 'sand', 'other',
];
const INDOOR_OUTDOOR: IndoorOutdoor[] = ['indoor', 'outdoor'];

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /** Must belong to the same tenant as the request */
  @IsUUID()
  venueId!: string;

  /** FK to identity-service branches.id — validated at service layer */
  @IsUUID()
  branchId!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  courtNumber?: number;

  /** FK to identity-service sports.id — null for multi-sport courts */
  @IsUUID()
  @IsOptional()
  sportId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  hourlyPrice?: number;

  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string;

  @IsEnum(SURFACES)
  @IsOptional()
  surface?: CourtSurface;

  @IsEnum(INDOOR_OUTDOOR)
  @IsOptional()
  indoorOutdoor?: IndoorOutdoor;

  /** Width in metres */
  @IsOptional()
  @Type(() => Number)
  width?: number;

  /** Length in metres */
  @IsOptional()
  @Type(() => Number)
  length?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  slotDuration?: number;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferBefore?: number;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferAfter?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isBookable?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

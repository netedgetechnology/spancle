import {
  IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsUUID, MaxLength,
} from 'class-validator';

const SCOPES = ['tenant', 'branch', 'court', 'sport'] as const;

export class CreateBlackoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @IsEnum(SCOPES)
  @IsOptional()
  scope?: typeof SCOPES[number];

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  courtId?: string;

  @IsUUID()
  @IsOptional()
  sportId?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsBoolean()
  @IsOptional()
  cancelExistingSlots?: boolean;

  @IsBoolean()
  @IsOptional()
  blockNewBookings?: boolean;
}

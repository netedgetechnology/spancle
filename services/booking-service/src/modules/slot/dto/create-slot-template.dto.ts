import {
  IsBoolean, IsDateString, IsInt, IsNotEmpty, IsObject,
  IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

export class RecurrenceRuleDto {
  @IsBoolean() monday!:    boolean;
  @IsBoolean() tuesday!:   boolean;
  @IsBoolean() wednesday!: boolean;
  @IsBoolean() thursday!:  boolean;
  @IsBoolean() friday!:    boolean;
  @IsBoolean() saturday!:  boolean;
  @IsBoolean() sunday!:    boolean;
}

export class CreateSlotTemplateDto {
  @IsUUID()
  courtId!: string;

  @IsUUID()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsObject()
  recurrence!: RecurrenceRuleDto;

  /** HH:MM override — null uses court operating hours */
  @IsString()
  @IsOptional()
  openTime?: string;

  @IsString()
  @IsOptional()
  closeTime?: string;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMins!: number;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferMins?: number;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  maxAdvanceDays?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxBookings?: number;

  @IsBoolean()
  @IsOptional()
  autoPublish?: boolean;
}

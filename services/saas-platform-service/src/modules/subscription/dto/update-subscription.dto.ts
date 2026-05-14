import {
  IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';

const STATUSES = ['trialing', 'active', 'past_due', 'cancelled', 'expired', 'paused'] as const;

export class UpdateSubscriptionDto {
  @IsEnum(STATUSES)
  @IsOptional()
  status?: typeof STATUSES[number];

  @IsString()
  @IsOptional()
  @MaxLength(255)
  externalSubId?: string;
}

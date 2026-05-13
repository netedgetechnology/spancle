import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePaymentDto {
  @IsString() @IsOptional() @MaxLength(1000)
  notes?: string;

  @IsObject() @IsOptional()
  providerMeta?: Record<string, unknown>;
}

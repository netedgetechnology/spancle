import {
  IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID,
} from 'class-validator';

export class CreatePlanDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  packageId!: string;

  @IsString()
  @IsNotEmpty()
  tierKey!: string;

  @IsObject()
  @IsOptional()
  featureOverrides?: Record<string, boolean>;

  @IsObject()
  @IsOptional()
  limitOverrides?: Record<string, number>;
}

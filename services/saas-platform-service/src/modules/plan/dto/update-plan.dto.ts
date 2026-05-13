import {{ IsBoolean, IsObject, IsOptional }} from 'class-validator';

export class UpdatePlanDto {{
  @IsObject()
  @IsOptional()
  featureOverrides?: Record<string, boolean>;

  @IsObject()
  @IsOptional()
  limitOverrides?: Record<string, number>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}}

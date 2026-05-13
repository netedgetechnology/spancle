import {
  IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsObject,
  IsOptional, IsString, IsUUID, IsUrl, MaxLength, IsInt, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeoFieldsDto } from '../../seo/dto/seo-fields.dto';

const PLACEMENTS  = ['hero', 'sidebar', 'inline', 'modal', 'footer', 'notification'] as const;
const STATUSES    = ['draft', 'active', 'inactive', 'scheduled'] as const;

export class CreateBannerDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  title!: string;

  @IsString() @IsOptional() @MaxLength(100)
  key?: string;

  @IsString() @IsOptional()
  subtitle?: string;

  @IsString() @IsOptional()
  body?: string;

  @IsString() @IsOptional() @MaxLength(100)
  ctaLabel?: string;

  @IsUrl() @IsOptional()
  ctaUrl?: string;

  @IsBoolean() @IsOptional()
  ctaTargetBlank?: boolean;

  @IsUUID() @IsOptional()
  imageId?: string;

  @IsUrl() @IsOptional()
  imageUrl?: string;

  @IsString() @IsOptional() @MaxLength(255)
  imageAlt?: string;

  @IsUrl() @IsOptional()
  mobileImageUrl?: string;

  @IsEnum(PLACEMENTS)
  @IsOptional()
  placement?: (typeof PLACEMENTS)[number];

  @IsEnum(STATUSES) @IsOptional()
  status?: (typeof STATUSES)[number];

  @IsISO8601() @IsOptional()
  activeFrom?: string;

  @IsISO8601() @IsOptional()
  activeTo?: string;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;

  @IsString() @IsOptional() @MaxLength(20)
  bgColor?: string;

  @IsObject() @IsOptional()
  meta?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => SeoFieldsDto)
  @IsOptional()
  seo?: SeoFieldsDto;
}

export class UpdateBannerDto {
  @IsString() @IsOptional() @MaxLength(255)
  title?: string;

  @IsString() @IsOptional() @MaxLength(100)
  key?: string;

  @IsString() @IsOptional()
  subtitle?: string;

  @IsString() @IsOptional()
  body?: string;

  @IsString() @IsOptional() @MaxLength(100)
  ctaLabel?: string;

  @IsUrl() @IsOptional()
  ctaUrl?: string;

  @IsBoolean() @IsOptional()
  ctaTargetBlank?: boolean;

  @IsUUID() @IsOptional()
  imageId?: string;

  @IsUrl() @IsOptional()
  imageUrl?: string;

  @IsString() @IsOptional() @MaxLength(255)
  imageAlt?: string;

  @IsUrl() @IsOptional()
  mobileImageUrl?: string;

  @IsEnum(PLACEMENTS) @IsOptional()
  placement?: (typeof PLACEMENTS)[number];

  @IsEnum(STATUSES) @IsOptional()
  status?: (typeof STATUSES)[number];

  @IsISO8601() @IsOptional()
  activeFrom?: string;

  @IsISO8601() @IsOptional()
  activeTo?: string;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;

  @IsString() @IsOptional() @MaxLength(20)
  bgColor?: string;

  @IsObject() @IsOptional()
  meta?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => SeoFieldsDto)
  @IsOptional()
  seo?: SeoFieldsDto;
}

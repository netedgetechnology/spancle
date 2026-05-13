import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SeoFieldsDto } from '../../seo/dto/seo-fields.dto';

const PAGE_STATUSES = ['draft', 'published', 'archived', 'scheduled'] as const;

export class CreatePageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  /**
   * URL slug — lowercase alphanumeric + hyphens.
   * Empty string is valid (maps to root '/').
   */
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens, or empty for root page',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim() ?? '')
  slug!: string;

  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @IsEnum(PAGE_STATUSES)
  @IsOptional()
  status?: (typeof PAGE_STATUSES)[number];

  @IsISO8601()
  @IsOptional()
  publishedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  template?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isHomepage?: boolean;

  @IsUUID()
  @IsOptional()
  featuredImageId?: string;

  @IsUrl()
  @IsOptional()
  featuredImageUrl?: string;

  @ValidateNested()
  @Type(() => SeoFieldsDto)
  @IsOptional()
  seo?: SeoFieldsDto;
}

export class UpdatePageDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug?: string;

  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @IsEnum(PAGE_STATUSES)
  @IsOptional()
  status?: (typeof PAGE_STATUSES)[number];

  @IsISO8601()
  @IsOptional()
  publishedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  template?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isHomepage?: boolean;

  @IsUUID()
  @IsOptional()
  featuredImageId?: string;

  @IsUrl()
  @IsOptional()
  featuredImageUrl?: string;

  @ValidateNested()
  @Type(() => SeoFieldsDto)
  @IsOptional()
  seo?: SeoFieldsDto;
}

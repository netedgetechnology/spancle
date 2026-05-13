import {
  IsArray, IsBoolean, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsObject,
  IsOptional, IsString, IsUUID, IsUrl,
  ArrayMinSize, ArrayMaxSize,
  Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SeoFieldsDto } from '../../seo/dto/seo-fields.dto';

const STATUSES = ['draft', 'published', 'archived', 'scheduled'] as const;

export class CreateBlogPostDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  title!: string;

  @IsString() @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsObject() @IsOptional()
  content?: Record<string, unknown>;

  @IsString() @IsOptional() @MaxLength(500)
  excerpt?: string;

  @IsEnum(STATUSES) @IsOptional()
  status?: (typeof STATUSES)[number];

  @IsISO8601() @IsOptional()
  publishedAt?: string;

  @IsUUID() @IsOptional()
  categoryId?: string;

  @IsString() @IsOptional() @MaxLength(500)
  tags?: string;

  @IsUUID() @IsOptional()
  featuredImageId?: string;

  @IsUrl() @IsOptional()
  featuredImageUrl?: string;

  @IsBoolean() @IsOptional()
  isFeatured?: boolean;

  @ValidateNested()
  @Type(() => SeoFieldsDto)
  @IsOptional()
  seo?: SeoFieldsDto;
}

export class UpdateBlogPostDto {
  @IsString() @IsOptional() @MaxLength(255)
  title?: string;

  @IsString() @IsOptional() @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug?: string;

  @IsObject() @IsOptional()
  content?: Record<string, unknown>;

  @IsString() @IsOptional() @MaxLength(500)
  excerpt?: string;

  @IsEnum(STATUSES) @IsOptional()
  status?: (typeof STATUSES)[number];

  @IsISO8601() @IsOptional()
  publishedAt?: string;

  @IsUUID() @IsOptional()
  categoryId?: string;

  @IsString() @IsOptional() @MaxLength(500)
  tags?: string;

  @IsUUID() @IsOptional()
  featuredImageId?: string;

  @IsUrl() @IsOptional()
  featuredImageUrl?: string;

  @IsBoolean() @IsOptional()
  isFeatured?: boolean;

  @ValidateNested()
  @Type(() => SeoFieldsDto)
  @IsOptional()
  seo?: SeoFieldsDto;
}

// ── BulkUpdateStatusDto ───────────────────────────────────────────────────────


export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsEnum(['draft', 'published', 'archived'])
  status!: 'draft' | 'published' | 'archived';
}

// ── CreateCategoryDto / UpdateCategoryDto ─────────────────────────────────────

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

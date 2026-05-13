import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SEO_ROBOTS_OPTIONS = [
  'index,follow',
  'noindex,follow',
  'index,nofollow',
  'noindex,nofollow',
] as const;

export type SeoRobotsOption = typeof SEO_ROBOTS_OPTIONS[number];

/**
 * SeoFieldsDto — embedded DTO for SEO metadata.
 *
 * Used via @ValidateNested() + @Type(() => SeoFieldsDto) inside
 * CreatePageDto, CreateBlogPostDto, CreateBannerDto.
 *
 * All fields are optional — SEO metadata is supplementary, not required.
 */
export class SeoFieldsDto {
  @IsString()
  @IsOptional()
  @MaxLength(120, { message: 'SEO title must not exceed 120 characters' })
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(320, { message: 'SEO description must not exceed 320 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  keywords?: string;

  @IsUrl({}, { message: 'Canonical URL must be a valid URL' })
  @IsOptional()
  canonicalUrl?: string;

  @IsEnum(SEO_ROBOTS_OPTIONS, {
    message: `robots must be one of: ${SEO_ROBOTS_OPTIONS.join(', ')}`,
  })
  @IsOptional()
  robots?: SeoRobotsOption;

  // ── Open Graph ──────────────────────────────────────────────────────────────

  @IsString()
  @IsOptional()
  @MaxLength(120)
  ogTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(320)
  ogDescription?: string;

  @IsUrl()
  @IsOptional()
  ogImageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  ogType?: string;

  // ── Twitter Card ─────────────────────────────────────────────────────────

  @IsEnum(['summary', 'summary_large_image', 'player', 'app'])
  @IsOptional()
  twitterCard?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  twitterTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(320)
  twitterDescription?: string;

  @IsUrl()
  @IsOptional()
  twitterImageUrl?: string;

  // ── Schema.org ──────────────────────────────────────────────────────────────

  @IsObject()
  @IsOptional()
  schemaJsonLd?: Record<string, unknown>;
}

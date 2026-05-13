import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SECTION_TYPES } from '../types/section-payload.types';

// ── CreateHomepageSectionDto ───────────────────────────────────────────────────

/**
 * CreateHomepageSectionDto
 *
 * The `payload` field is typed as `Record<string, unknown>` at the DTO layer.
 * Structural validation of the payload is performed in HomepageService
 * via SECTION_SCHEMAS[sectionType].parse(payload) before any DB write.
 */
export class CreateHomepageSectionDto {
  @IsUUID()
  pageId!: string;

  @IsEnum(SECTION_TYPES, {
    message: `sectionType must be one of: ${SECTION_TYPES.join(', ')}`,
  })
  sectionType!: typeof SECTION_TYPES[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminLabel!: string;

  /**
   * Typed JSONB payload — shape is validated against the sectionType schema
   * inside HomepageService before persisting.
   */
  @IsObject()
  payload!: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  abVariant?: string;
}

// ── UpdateHomepageSectionDto ───────────────────────────────────────────────────

export class UpdateHomepageSectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  adminLabel?: string;

  /**
   * Partial payload update — merged with existing payload in service layer.
   * Full payload validation runs after merge.
   */
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  abVariant?: string;
}

// ── ReorderSectionsDto ────────────────────────────────────────────────────────

class SectionOrderItem {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

/**
 * ReorderSectionsDto — sent after a drag-and-drop operation in the admin UI.
 * Contains the complete new ordered list for the page.
 * Service validates all IDs belong to the same tenantId before updating.
 */
export class ReorderSectionsDto {
  @IsUUID()
  pageId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionOrderItem)
  sections!: SectionOrderItem[];
}

// ── CloneSectionDto ────────────────────────────────────────────────────────────

export class CloneSectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminLabel!: string;

  @IsUUID()
  @IsOptional()
  targetPageId?: string;
}

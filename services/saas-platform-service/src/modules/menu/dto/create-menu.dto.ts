import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, IsUrl, Matches, MaxLength, Min,
  ValidateNested, ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const LINK_TYPES = ['internal_page', 'internal_post', 'external_url', 'custom'] as const;
const TARGETS    = ['_self', '_blank'] as const;

export class CreateMenuItemDto {
  @IsUUID() @IsOptional()
  parentId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  label!: string;

  @IsEnum(LINK_TYPES) @IsOptional()
  linkType?: (typeof LINK_TYPES)[number];

  @IsString() @IsOptional() @MaxLength(2048)
  url?: string;

  @IsUUID() @IsOptional()
  pageId?: string;

  @IsUUID() @IsOptional()
  postId?: string;

  @IsEnum(TARGETS) @IsOptional()
  target?: (typeof TARGETS)[number];

  @IsString() @IsOptional() @MaxLength(100)
  iconName?: string;

  @IsString() @IsOptional() @MaxLength(100)
  cssClass?: string;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}

export class CreateMenuDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Handle must be lowercase alphanumeric with hyphens' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  handle!: string;

  @IsString() @IsOptional() @MaxLength(500)
  description?: string;

  @IsBoolean() @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemDto)
  @ArrayMaxSize(100)
  @IsOptional()
  items?: CreateMenuItemDto[];
}

export class UpdateMenuDto {
  @IsString() @IsOptional() @MaxLength(100)
  name?: string;

  @IsString() @IsOptional() @MaxLength(500)
  description?: string;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}

export class UpdateMenuItemDto {
  @IsString() @IsOptional() @MaxLength(255)
  label?: string;

  @IsEnum(LINK_TYPES) @IsOptional()
  linkType?: (typeof LINK_TYPES)[number];

  @IsString() @IsOptional() @MaxLength(2048)
  url?: string;

  @IsUUID() @IsOptional()
  pageId?: string;

  @IsUUID() @IsOptional()
  postId?: string;

  @IsUUID() @IsOptional()
  parentId?: string;

  @IsEnum(TARGETS) @IsOptional()
  target?: (typeof TARGETS)[number];

  @IsString() @IsOptional() @MaxLength(100)
  iconName?: string;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}

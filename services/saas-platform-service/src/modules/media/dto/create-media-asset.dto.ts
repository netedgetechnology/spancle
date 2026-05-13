import {
  IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive,
  IsString, IsUrl, MaxLength, Min,
} from 'class-validator';

const ASSET_TYPES = ['image', 'video', 'document', 'audio', 'other'] as const;
const DRIVERS     = ['local', 's3', 'gcs'] as const;

export class CreateMediaAssetDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  originalName!: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  storedName!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  mimeType!: string;

  @IsEnum(ASSET_TYPES) @IsOptional()
  assetType?: (typeof ASSET_TYPES)[number];

  @IsInt() @IsPositive()
  sizeBytes!: number;

  @IsUrl()
  url!: string;

  @IsString() @IsNotEmpty() @MaxLength(2048)
  storagePath!: string;

  @IsEnum(DRIVERS) @IsOptional()
  driver?: (typeof DRIVERS)[number];

  @IsString() @IsOptional() @MaxLength(255)
  altText?: string;

  @IsString() @IsOptional() @MaxLength(500)
  caption?: string;

  @IsInt() @Min(1) @IsOptional()
  widthPx?: number;

  @IsInt() @Min(1) @IsOptional()
  heightPx?: number;

  @IsString() @IsOptional() @MaxLength(100)
  blurHash?: string;
}

export class UpdateMediaAssetDto {
  @IsString() @IsOptional() @MaxLength(255)
  altText?: string;

  @IsString() @IsOptional() @MaxLength(500)
  caption?: string;
}

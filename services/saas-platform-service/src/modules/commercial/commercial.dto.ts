import {
  IsEnum, IsInt, IsJSON, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import {
  CommercialRuleStatus,
  CommercialRuleType,
  FeatureFlagStatus,
  GatewayScope,
  GatewayType,
  PaymentOwnershipType,
  PricingModelType,
  RevenueDistributionType,
} from './enums/commercial.enums';

// ── CommercialRule DTOs ───────────────────────────────────────────────────────

export class CreateCommercialRuleDto {
  @IsUUID() @IsOptional()
  tenantId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @IsEnum(CommercialRuleType)
  ruleType!: CommercialRuleType;
}

export class UpdateCommercialRuleDto {
  @IsString() @IsOptional() @MaxLength(255)
  name?: string;

  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @IsEnum(CommercialRuleStatus) @IsOptional()
  status?: CommercialRuleStatus;

  @IsString() @IsOptional() @MaxLength(32)
  activeVersion?: string;
}

// ── CommercialRuleVersion DTOs ────────────────────────────────────────────────

export class CreateCommercialRuleVersionDto {
  @IsUUID()
  ruleId!: string;

  @IsString() @IsNotEmpty() @MaxLength(32)
  version!: string;

  /** Must be a valid JSON object string */
  definition!: Record<string, unknown>;

  @IsString() @IsOptional()
  changelog?: string;
}

// ── PackageDefinition DTOs ────────────────────────────────────────────────────

export class CreatePackageDefinitionDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(64)
  slug!: string;

  @IsString() @IsOptional()
  description?: string;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;
}

export class UpdatePackageDefinitionDto {
  @IsString() @IsOptional() @MaxLength(255)
  name?: string;

  @IsString() @IsOptional()
  description?: string;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;
}

// ── CommercialProduct DTOs ────────────────────────────────────────────────────

export class CreateCommercialProductDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(128)
  sku!: string;

  @IsString() @IsOptional()
  description?: string;
}

// ── PricingModel DTOs ─────────────────────────────────────────────────────────

export class CreatePricingModelDto {
  @IsUUID() @IsOptional()
  tenantId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsEnum(PricingModelType)
  modelType!: PricingModelType;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  config!: Record<string, unknown>;
}

// ── PaymentOwnershipPolicy DTOs ───────────────────────────────────────────────

export class CreatePaymentOwnershipPolicyDto {
  @IsUUID() @IsOptional()
  tenantId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsEnum(PaymentOwnershipType)
  ownershipType!: PaymentOwnershipType;

  @IsInt() @Min(0) @Max(10000)
  platformShareBps!: number;
}

// ── RevenueDistributionPolicy DTOs ────────────────────────────────────────────

export class CreateRevenueDistributionPolicyDto {
  @IsUUID() @IsOptional()
  tenantId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsEnum(RevenueDistributionType)
  distributionType!: RevenueDistributionType;

  tiers!: Array<{ upToMinor: number | null; rateBps: number }>;
}

// ── GatewayCredential DTOs ────────────────────────────────────────────────────

export class UpsertGatewayCredentialDto {
  @IsUUID() @IsOptional()
  tenantId?: string;

  @IsUUID()
  gatewayDefinitionId!: string;

  @IsEnum(GatewayScope)
  scope!: GatewayScope;

  publicConfig!: Record<string, unknown>;
}

// ── FeatureFlag DTOs ──────────────────────────────────────────────────────────

export class UpsertFeatureFlagDto {
  @IsUUID() @IsOptional()
  tenantId?: string;

  @IsString() @IsNotEmpty() @MaxLength(128)
  key!: string;

  @IsEnum(FeatureFlagStatus)
  status!: FeatureFlagStatus;

  @IsInt() @Min(0) @Max(100) @IsOptional()
  rolloutPercentage?: number;

  @IsString() @IsOptional()
  description?: string;
}

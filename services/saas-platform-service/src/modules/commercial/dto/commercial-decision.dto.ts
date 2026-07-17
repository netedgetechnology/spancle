import {
  IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional,
  IsString, IsUUID, MaxLength, Min,
} from 'class-validator';
import { TransactionType } from '../enums/commercial.enums';
import type { CommercialDecisionResult } from '../interfaces/commercial-decision.interfaces';

// ── Request ───────────────────────────────────────────────────────────────────

export class CommercialDecisionRequestDto {
  /** moduleId identifies which functional module is requesting a decision. */
  @IsString() @IsNotEmpty() @MaxLength(128)
  moduleId!: string;

  /**
   * Product identifier — SKU string or UUID.
   * The service resolves this to a CommercialProductEntity.
   */
  @IsString() @IsNotEmpty() @MaxLength(128)
  productId!: string;

  @IsEnum(TransactionType)
  transactionType!: TransactionType;

  /** Transaction amount in minor currency units. Must be >= 0 (INT). */
  @IsInt() @Min(0)
  amountMinor!: number;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  @IsString() @IsNotEmpty() @MaxLength(2)
  country!: string;

  @IsObject() @IsOptional()
  metadata?: Record<string, unknown>;
}

// ── Response ──────────────────────────────────────────────────────────────────

export class CommercialDecisionResponseDto {
  decisionId!: string;
  tenantId!: string;
  moduleId!: string;
  productId!: string;
  transactionType!: TransactionType;
  outcome!: string;
  reason!: string;
  resolvedPackage!: { slug: string; version: string } | null;
  productEligible!: boolean;
  appliedPolicyIds!: string[];
  generatedAt!: string;

  static from(result: CommercialDecisionResult): CommercialDecisionResponseDto {
    const dto = new CommercialDecisionResponseDto();
    dto.decisionId       = result.decisionId;
    dto.tenantId         = result.tenantId;
    dto.moduleId         = result.moduleId;
    dto.productId        = result.productId;
    dto.transactionType  = result.transactionType;
    dto.outcome          = result.outcome;
    dto.reason           = result.reason;
    dto.resolvedPackage  = result.resolvedPackage;
    dto.productEligible  = result.productEligible;
    dto.appliedPolicyIds = result.appliedPolicyIds;
    dto.generatedAt      = result.generatedAt.toISOString();
    return dto;
  }
}

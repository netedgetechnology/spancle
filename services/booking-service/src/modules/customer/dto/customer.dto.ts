import {
  IsBoolean, IsDateString, IsEmail, IsEnum,
  IsInt, IsNotEmpty, IsObject, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { EmergencyContact, CustomerAddress } from '../entities/customer.entity';

const GENDERS  = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
const STATUSES = ['active', 'inactive', 'banned'] as const;

export class CreateCustomerDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  userId?: string;

  @IsUUID() @IsOptional()
  parentCustomerId?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @IsEnum(GENDERS) @IsOptional()
  gender?: typeof GENDERS[number];

  @IsDateString() @IsOptional()
  dateOfBirth?: string;

  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @IsEmail() @IsOptional() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsObject() @IsOptional()
  emergencyContact?: EmergencyContact;

  @IsObject() @IsOptional()
  address?: CustomerAddress;

  @IsString() @IsOptional() @MaxLength(2000)
  profilePhoto?: string;

  @IsString() @IsOptional() @MaxLength(5000)
  notes?: string;

  @IsBoolean() @IsOptional()
  isGuest?: boolean;
}

export class UpdateCustomerDto {
  @IsString() @IsNotEmpty() @MaxLength(100) @IsOptional()
  firstName?: string;

  @IsString() @IsNotEmpty() @MaxLength(100) @IsOptional()
  lastName?: string;

  @IsEnum(GENDERS) @IsOptional()
  gender?: typeof GENDERS[number];

  @IsDateString() @IsOptional()
  dateOfBirth?: string;

  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @IsEmail() @IsOptional() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsObject() @IsOptional()
  emergencyContact?: EmergencyContact | null;

  @IsObject() @IsOptional()
  address?: CustomerAddress | null;

  @IsString() @IsOptional() @MaxLength(2000)
  profilePhoto?: string | null;

  @IsString() @IsOptional() @MaxLength(5000)
  notes?: string | null;

  @IsEnum(STATUSES) @IsOptional()
  status?: typeof STATUSES[number];

  @IsUUID() @IsOptional()
  parentCustomerId?: string | null;

  @IsInt() @Min(0) @Max(10_000_000) @IsOptional()
  walletBalanceMinor?: number;
}

export class CustomerQueryDto {
  /** Full-text search — matches against fullName, email, phone */
  @IsString() @IsOptional() @MaxLength(100)
  q?: string;

  @IsEnum(STATUSES) @IsOptional()
  status?: typeof STATUSES[number];

  @IsUUID() @IsOptional()
  branchId?: string;

  @IsBoolean() @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  isGuest?: boolean;

  @IsString() @IsOptional()
  @IsEnum(['fullName', 'createdAt', 'email'])
  sortBy?: 'fullName' | 'createdAt' | 'email';

  @IsString() @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsInt() @Min(1) @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}

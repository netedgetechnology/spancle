import {
  IsEmail, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class JoinWaitlistDto {
  @IsUUID()
  slotId!: string;

  @IsUUID()
  courtId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID() @IsOptional()
  userId?: string;

  @IsUUID() @IsOptional()
  customerId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  customerName!: string;

  @IsEmail() @IsOptional() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  customerEmail?: string;

  @IsString() @IsOptional() @MaxLength(30)
  customerPhone?: string;

  @IsString() @IsOptional() @MaxLength(2000)
  notes?: string;
}

export class WaitlistQueryDto {
  @IsUUID() @IsOptional()
  slotId?: string;

  @IsUUID() @IsOptional()
  customerId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsString() @IsOptional()
  status?: string;

  @IsInt() @Min(1) @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── LoginDto ──────────────────────────────────────────────────────────────────

export class LoginDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254, { message: 'Email must not exceed 254 characters' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password!: string;
}

// ── RefreshTokenDto ───────────────────────────────────────────────────────────

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

// ── LogoutDto ─────────────────────────────────────────────────────────────────

export class LogoutDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

// ── ChangePasswordDto ─────────────────────────────────────────────────────────

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword!: string;
}

// ── ForgotPasswordDto ─────────────────────────────────────────────────────────

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;
}

// ── ResetPasswordDto ──────────────────────────────────────────────────────────

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword!: string;
}

import { IsString, IsNotEmpty, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class UpdateIdentityDto {
  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  password?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newPassword!: string;
}

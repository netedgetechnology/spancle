import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePlayerDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

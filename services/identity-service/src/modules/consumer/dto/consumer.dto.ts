import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterConsumerDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsEmail() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString() @MinLength(8) @MaxLength(100)
  password!: string;
}

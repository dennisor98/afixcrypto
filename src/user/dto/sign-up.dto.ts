import { IsEmail, IsString, Length, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignupDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  email: string;

  @IsString()
  @Length(3, 30, { message: 'Username must be 3-30 characters' })
  userName: string;

  @IsString()
  @Length(8, 128, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain a special character' })
  password: string;

  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  emailCode: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  referralCode?: string;
}
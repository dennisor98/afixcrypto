import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEmail } from 'class-validator';

// Only fields an admin may change are listed. password, privateKey,
// referralCode and roles are deliberately excluded. Role changes go through
// the super admin route, which writes to the audit log.
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  userName?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isEmailConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  hasMadeFirstDeposit?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isblocked?: boolean;
}
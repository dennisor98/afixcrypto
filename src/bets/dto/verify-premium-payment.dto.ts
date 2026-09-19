import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyPremiumPaymentDto {
  @IsString()
  @Length(64, 64)
  @ApiProperty({ description: 'Confirmed TRON transaction hash for the USDT payment.' })
  transactionHash: string;
}
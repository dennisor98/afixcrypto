import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsUUID } from 'class-validator';

export class SubscribeBotDto {
  @IsUUID()
  @ApiProperty()
  botId: string;

  @IsNumberString()
  @ApiProperty({ description: 'Stake amount for each automatic trade.' })
  Amount: string;

  @IsIn(['5m', '15m', '30m', '24h'])
  @ApiProperty({ enum: ['5m', '15m', '30m', '24h'], default: '5m' })
  Period: string;
}
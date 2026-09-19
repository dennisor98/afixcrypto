import { DefaultDto } from '../../app/dto/dto';
/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Direction } from '../entities/signal.interval';

export class CreateBetDto extends DefaultDto {
    @IsNotEmpty()
    @ApiProperty({ description: 'Use 24h for the fixed-return 24-hour trade.' })
    Period: string;

    @IsNotEmpty()
    @ApiProperty()
    Amount: string;
    @IsOptional()
    @IsEnum(Direction)
    @ApiProperty({ required: false, enum: Direction, enumName: 'Direction' })
    direction?: Direction;
    @IsNotEmpty()
    @ApiProperty({ default: false })
    isVatual: boolean;

    @IsOptional()
    @IsUUID()
    @ApiProperty({ required: false, description: 'Active trading bot selected by the user.' })
    botId?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    @ApiProperty({ required: false, default: 1, maximum: 10, description: 'Number of simultaneous bot trades.' })
    tradeCount?: number;
 
}
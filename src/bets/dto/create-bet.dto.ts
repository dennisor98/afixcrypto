import { DefaultDto } from '../../app/dto/dto';
/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { Direction } from '../entities/signal.interval';

export class CreateBetDto extends DefaultDto {
    @IsNotEmpty()
    @ApiProperty()
    Period: string;

    @IsNotEmpty()
    @ApiProperty()
    Amount: string;
    @IsNotEmpty()
    @ApiProperty({ enum: Direction, enumName: 'Direction' }) // Add this line to document the enum in Swagger
    direction: Direction;
    @IsNotEmpty()
    @ApiProperty({ default: false })
    isVatual: boolean;
 
}
import { DefaultDto } from '../../app/dto/dto';
/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { Direction } from '../entities/signal.interval';

export class updateSignalBetDto extends DefaultDto {
 
    @IsNotEmpty()
    @ApiProperty({ enum: Direction, enumName: 'Direction' }) // Add this line to document the enum in Swagger
    direction: Direction;

 
}
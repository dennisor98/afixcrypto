import { DefaultDto } from './../../app/dto/dto';
/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, isNotEmpty, IsNotEmpty } from "class-validator";

export class Create_Interval_dto extends DefaultDto{
    @IsNotEmpty()
    @ApiProperty()
    Dayhour: string;

    @IsNotEmpty()
    @ApiProperty()
    interval: string;
 
}

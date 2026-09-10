import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMailerDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    email: string;
}
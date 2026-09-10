import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyLoginOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    @Length(6, 6)
    otp: string;
}
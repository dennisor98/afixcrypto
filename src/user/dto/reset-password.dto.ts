import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    @Length(6, 6)
    otp: string;

    @IsString()
    @Length(8, 128)
    @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
    @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter' })
    @Matches(/[0-9]/, { message: 'Password must contain a number' })
    @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain a special character' })
    newPassword: string;
}
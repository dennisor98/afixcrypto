/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

// No user field: identity comes from the verified token only
export class WithdrawWalletDto {
    @IsNotEmpty()
    @ApiProperty()
    address: string;

    @IsNotEmpty()
    @ApiProperty()
    amount: string;
}
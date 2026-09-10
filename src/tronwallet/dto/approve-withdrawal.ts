/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { state } from '../entities/withdrawal.request.entity';

export class ApproveWithdrawalBetDto {
    @IsNotEmpty()
    @ApiProperty()
    withdrawalId: string;

    @IsNotEmpty()
    @ApiProperty({ enum: state, enumName: 'status' })
    status: state;
}
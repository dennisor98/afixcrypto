import { PartialType } from '@nestjs/mapped-types';
import { CreateTronwalletDto } from './create-tronwallet.dto';

export class UpdateTronwalletDto extends PartialType(CreateTronwalletDto) {}

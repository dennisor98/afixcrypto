import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { ReferralBonus } from './entities/bonus.entity';
import { Referrer } from './entities/referral.entity';
import { ReferralsController } from './referral.controller';
import { ReferralsService } from './referral.service';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';


@Module({imports:[TypeOrmModule.forFeature([User,Wallet,Referrer,ReferralBonus])],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports:[ReferralsService]
})
export class ReferralModule {}

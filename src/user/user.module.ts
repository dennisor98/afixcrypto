import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TronwalletModule } from 'src/tronwallet/tronwallet.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MailModule } from 'src/mailer/mailer.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Wallet } from './entities/user.wallet.entity';
import { ReferralModule } from 'src/referral/referral.module';
import { ReferralsService } from 'src/referral/referral.service';
import { Referrer } from 'src/referral/entities/referral.entity';
import { ReferralBonus } from 'src/referral/entities/bonus.entity';
import { WithdrawalRequests } from 'src/tronwallet/entities/withdrawal.request.entity';
import { Bet } from 'src/bets/entities/bet.entity';
import { TronwalletDeposits } from 'src/tronwallet/entities/tronwallet.entity';
import { AuthModule } from 'src/auth/auth.module';
import { SeederService} from "./seeder.service";

@Module({imports:[ ConfigModule,
  JwtModule.registerAsync({
  global: true,
  imports:[ConfigModule],
  useFactory:(configService:ConfigService)=>({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: '30d' },
  }),
  inject:[ConfigService],
}),MailModule,TronwalletModule,AuthModule,TypeOrmModule.forFeature([User,Wallet,WithdrawalRequests,Referrer,ReferralBonus,Bet,TronwalletDeposits]),],
  controllers: [UserController],
  providers: [UserService,ReferralsService],
  exports:[UserService]
})
export class UserModule {}

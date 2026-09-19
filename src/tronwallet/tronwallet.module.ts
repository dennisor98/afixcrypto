import { Module } from '@nestjs/common';
import { TronWalletService } from './tronwallet.service';
import { TronwalletController } from './tronwallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TronwalletDeposits } from './entities/tronwallet.entity';
import { User } from 'src/user/entities/user.entity';
import { SchedulerService } from './tast.service';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { ReferralModule } from 'src/referral/referral.module';
import { WithdrawalRequests } from './entities/withdrawal.request.entity';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/auth/auth.module';
import { Bet } from 'src/bets/entities/bet.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PremiumBotPayment } from './entities/premium-bot-payment.entity';
import { PremiumAccessService } from './premium-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TronwalletDeposits,
      User,
      Wallet,
      WithdrawalRequests,
      Bet,
      PremiumBotPayment,
    ]),
    ReferralModule,
    HttpModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [TronwalletController],
  providers: [TronWalletService, SchedulerService, PremiumAccessService],
  exports: [TronWalletService, SchedulerService, PremiumAccessService],
})
export class TronwalletModule {}

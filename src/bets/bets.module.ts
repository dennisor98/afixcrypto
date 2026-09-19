/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { UserModule } from './../user/user.module';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';
import { DailySchedulerService } from './bet_task_service';
import { BetProcessor } from './bet_processor';
import { PriceService } from './price.service';
import { TradingBotsService } from './trading-bots.service';
import { TradingBotsController } from './trading-bots.controller';
import { BotExecutionService } from './bot-execution.service';
import { BotExecutionController } from './bot-execution.controller';

import { Signals } from './entities/signal.interval';
import { Bet } from './entities/bet.entity';
import { TradingBot } from './entities/trading-bot.entity';
import { BotSubscription } from './entities/bot-subscription.entity';
import { signal_Hour } from './entities/signal.entity';
import { User } from 'src/user/entities/user.entity';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { ReferralModule } from 'src/referral/referral.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AdminModule } from 'src/admin/admin.module';
import { TronwalletModule } from 'src/tronwallet/tronwallet.module';

@Module({
  imports: [
    // Redis config read from env so settlement jobs run in production
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      },
    }),
    BullModule.registerQueue({ name: 'betQueue' }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Wallet, Signals, Bet, signal_Hour, TradingBot, BotSubscription]),
    UserModule,
    ReferralModule,
    NotificationsModule,
    forwardRef(() => AdminModule),
    TronwalletModule,
  ],
  controllers: [BetsController, TradingBotsController, BotExecutionController],
  providers: [BetsService, DailySchedulerService, BetProcessor, PriceService, TradingBotsService, BotExecutionService],
  exports: [BetsService, DailySchedulerService, BetProcessor, PriceService, TradingBotsService, BotExecutionService],
})
export class BetsModule {}
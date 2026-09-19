import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { join } from 'path';

// Entities
import { User } from 'src/user/entities/user.entity';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { Mailer } from 'src/mailer/entities/mailer.entity';
import { TronwalletDeposits } from 'src/tronwallet/entities/tronwallet.entity';
import { WithdrawalRequests } from 'src/tronwallet/entities/withdrawal.request.entity';
import { Referrer } from 'src/referral/entities/referral.entity';
import { ReferralBonus } from 'src/referral/entities/bonus.entity';
import { Bet } from 'src/bets/entities/bet.entity';
import { Signals } from 'src/bets/entities/signal.interval';
import { signal_Hour } from 'src/bets/entities/signal.entity';
import { PlatformSettings } from 'src/admin/entities/platform-settings.entity';
import { AdminAuditLog } from 'src/admin/entities/admin-audit-log.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { TradingBot } from 'src/bets/entities/trading-bot.entity';
import { BotSubscription } from 'src/bets/entities/bot-subscription.entity';
import { PremiumBotPayment } from 'src/tronwallet/entities/premium-bot-payment.entity';


// Modules
import { UserModule } from 'src/user/user.module';
import { TronwalletModule } from 'src/tronwallet/tronwallet.module';
import { MailModule } from 'src/mailer/mailer.module';
import { ReferralModule } from 'src/referral/referral.module';
import { BetsModule } from 'src/bets/bets.module';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AdminModule } from 'src/admin/admin.module';
import { CommonModule } from 'src/common/common.module';

// Controller
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],

  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([
      // All named throttlers are evaluated for routes without an explicit
      // override. Keep the general API usable for dashboard polling and
      // shared IP addresses, while route-level auth/OTP limits remain strict.
      { name: 'short', ttl: 60_000, limit: 300 },
      { name: 'medium', ttl: 60_000 * 10, limit: 2_500 },
      { name: 'auth', ttl: 60_000 * 15, limit: 1_000 },
    ]),

    ServeStaticModule.forRoot(
        { rootPath: join(__dirname, '..', 'admin'), serveRoot: '/fel-admin/' },
        { rootPath: join(__dirname, '..', 'strategy'), serveRoot: '/strategy/' },
        { rootPath: join(__dirname, '..', 'public') },
    ),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const useTls = configService.get<string>('REDIS_TLS') === 'true';
        return {
          redis: {
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: configService.get<number>('REDIS_PORT') ?? 6379,
            password: configService.get<string>('REDIS_PASSWORD') || undefined,
            tls: useTls ? {} : undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          settings: {
            stalledInterval: configService.get<number>('REDIS_STALLED_INTERVAL') ?? 30000,
            maxStalledCount: configService.get<number>('REDIS_MAX_STALLED_COUNT') ?? 1,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'betQueue' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') ?? 3306,
        username: configService.get<string>('DB_USER') || 'root',
        password: configService.get<string>('DB_PASS') || '',
        database: configService.get<string>('DB_NAME') || 'test',
        entities: [
          User, Wallet, Mailer, TronwalletDeposits, WithdrawalRequests,
          Referrer, ReferralBonus, Bet, Signals, signal_Hour,
          PlatformSettings, AdminAuditLog, Notification, TradingBot, BotSubscription, PremiumBotPayment,
        ],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE') ?? false,
        logging: configService.get<boolean>('DB_LOGGING') ?? false,
        timezone: configService.get<string>('DB_TIMEZONE') || 'Z',
      }),
    }),

    UserModule,
    TronwalletModule,
    MailModule,
    ReferralModule,
    BetsModule,
    AuthModule,
    NotificationsModule,
    AdminModule,
    CommonModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

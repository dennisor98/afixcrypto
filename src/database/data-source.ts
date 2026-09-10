import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

// Entities
import { User } from '../user/entities/user.entity';
import { Wallet } from '../user/entities/user.wallet.entity';
import { Mailer } from '../mailer/entities/mailer.entity';
import { TronwalletDeposits } from '../tronwallet/entities/tronwallet.entity';
import { WithdrawalRequests } from '../tronwallet/entities/withdrawal.request.entity';
import { Referrer } from '../referral/entities/referral.entity';
import { ReferralBonus } from '../referral/entities/bonus.entity';
import { Bet } from '../bets/entities/bet.entity';
import { Signals } from '../bets/entities/signal.interval';
import { signal_Hour } from '../bets/entities/signal.entity';
import { PlatformSettings } from '../admin/entities/platform-settings.entity';
import { AdminAuditLog } from '../admin/entities/admin-audit-log.entity';

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: [
        User, Wallet, Mailer, TronwalletDeposits, WithdrawalRequests,
        Referrer, ReferralBonus, Bet, Signals, signal_Hour,
        PlatformSettings, AdminAuditLog,
    ],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: true,
    timezone: 'Z',
});
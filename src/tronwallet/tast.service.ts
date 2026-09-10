/* eslint-disable prettier/prettier */
// scheduler.service.ts
import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { TronWalletService } from './tronwallet.service';
import { TronwalletDeposits } from './entities/tronwallet.entity';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { ReferralsService } from 'src/referral/referral.service';
import { SettingsService } from 'src/common/settings.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

const POLL_INTERVAL_MS = 4 * 60 * 1000;
const USDT_DECIMALS = 1_000_000;

@Injectable()
export class SchedulerService
    implements OnApplicationBootstrap, OnApplicationShutdown
{
    private readonly logger = new Logger(SchedulerService.name);
    private interval: NodeJS.Timeout;
    // Guards against a slow cycle overlapping the next tick
    private isRunning = false;

    constructor(
        @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(TronwalletDeposits)
        private readonly tronwalletDepositsRepository: Repository<TronwalletDeposits>,
        private readonly tronService: TronWalletService,
        private readonly referralsService: ReferralsService,
        private readonly settingsService: SettingsService,
        private readonly notificationsGateway: NotificationsGateway,
        private readonly dataSource: DataSource,
    ) {}

    async onApplicationBootstrap() {
        this.startScheduler();
    }

    async onApplicationShutdown() {
        this.stopScheduler();
    }

    startScheduler(): void {
        this.interval = setInterval(() => {
            void this.runCycle();
        }, POLL_INTERVAL_MS);
    }

    stopScheduler(): void {
        clearInterval(this.interval);
    }

    private async runCycle(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Previous deposit cycle still running, skipping tick');
            return;
        }
        this.isRunning = true;

        try {
            const users = await this.userRepo.find({
                select: ['id', 'address', 'hasMadeFirstDeposit'],
            });

            for (const user of users) {
                if (!user.address) continue;
                // One user failing must not stop the rest of the cycle
                try {
                    await this.processUserDeposits(user);
                } catch (err: any) {
                    this.logger.error(
                        `Deposit check failed for user ${user.id}: ${err?.message}`,
                    );
                }
            }
        } catch (error: any) {
            this.logger.error(`Deposit cycle failed: ${error?.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    private async processUserDeposits(user: User): Promise<void> {
        const transactions = await this.tronService.getIncomingTransactions(
            user.address,
        );
        if (transactions.length === 0) return;

        const settings = await this.settingsService.get();
        const minDeposit = Number(settings?.minDeposit ?? 0);

        // Oldest first so deposits credit in the order they arrived
        for (const transaction of [...transactions].reverse()) {
            const transactionId = transaction.transaction_id;
            if (!transactionId) continue;

            const existing =
                await this.tronService.getTronwalletDepositByTransactionId(
                    transactionId,
                );
            if (existing) continue;

            const amount = parseFloat(transaction.value ?? '0') / USDT_DECIMALS;
            if (!Number.isFinite(amount) || amount <= 0) {
                this.logger.warn(`Skipping ${transactionId}: invalid amount`);
                continue;
            }

            if (minDeposit > 0 && amount < minDeposit) {
                this.logger.warn(
                    `Deposit ${transactionId} of ${amount} is below the ${minDeposit} minimum`,
                );
                continue;
            }

            await this.creditDeposit(user, transaction, transactionId, amount);
        }
    }

    // The deposit record and the balance credit commit together, so a crash
    // can never leave one without the other. The unique transaction_id column
    // is the final guard against crediting the same transfer twice.
    private async creditDeposit(
        user: User,
        transaction: any,
        transactionId: string,
        amount: number,
    ): Promise<void> {
        let isFirstDeposit = false;

        try {
            await this.dataSource.transaction(async (manager) => {
                const duplicate = await manager
                    .getRepository(TronwalletDeposits)
                    .findOne({ where: { transaction_id: transactionId } });
                if (duplicate) return;

                const depo = new TronwalletDeposits();
                depo.amount = amount;
                depo.block_timestamp = `${transaction.block_timestamp}`;
                depo.from_address = transaction.from ?? '';
                depo.name = transaction.token_info?.name ?? '';
                depo.to_address = transaction.to ?? '';
                depo.transaction_id = transactionId;
                depo.transferType = transaction.type ?? '';
                depo.user = user;
                await manager.save(depo);

                const wallet = await manager
                    .getRepository(Wallet)
                    .createQueryBuilder('w')
                    .setLock('pessimistic_write')
                    .where('w.userId = :userId', { userId: user.id })
                    .getOne();

                if (!wallet) {
                    throw new Error(`Wallet not found for user ${user.id}`);
                }

                wallet.amount = (parseFloat(wallet.amount) + amount).toFixed(8);
                await manager.save(wallet);

                if (!user.hasMadeFirstDeposit) {
                    isFirstDeposit = true;
                    await manager
                        .getRepository(User)
                        .update(user.id, { hasMadeFirstDeposit: true });
                }
            });
        } catch (err: any) {
            this.logger.error(
                `Failed to credit deposit ${transactionId} for user ${user.id}: ${err?.message}`,
            );
            return;
        }

        this.logger.log(
            `Credited deposit ${transactionId}: ${amount} USDT to user ${user.id}`,
        );

        // Notification failure must never affect a confirmed deposit
        try {
            await this.notificationsGateway.emitDeposit(user.id, amount);
        } catch (err: any) {
            this.logger.error(
                `Deposit notification failed for user ${user.id}: ${err?.message}`,
            );
        }

        // Referral bonus runs outside the transaction so a bonus failure
        // can never roll back a confirmed deposit
        if (isFirstDeposit) {
            try {
                await this.referralsService.handleFirstdepo(user, amount);
            } catch (err: any) {
                this.logger.error(
                    `Referral bonus failed for user ${user.id}: ${err?.message}`,
                );
            }
        }
    }
}
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { BetsService } from './bets.service';
import { BotSubscription } from './entities/bot-subscription.entity';
import { PremiumAccessService } from 'src/tronwallet/premium-access.service';
import { TradingBotsService } from './trading-bots.service';

@Injectable()
export class BotExecutionService {
  private readonly logger = new Logger(BotExecutionService.name);
  private isRunning = false;

  constructor(
    @InjectRepository(BotSubscription)
    private readonly subscriptionsRepository: Repository<BotSubscription>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly betsService: BetsService,
    private readonly premiumAccessService: PremiumAccessService,
    private readonly tradingBotsService: TradingBotsService,
  ) {}

  @Cron('* * * * *')
  async executeDueBots(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const subscriptions = await this.subscriptionsRepository.find({
        where: { isActive: true, nextRunAt: LessThanOrEqual(new Date()) },
        relations: { user: true, bot: true },
      });
      await Promise.all(
        subscriptions
          .map(subscription => this.executeSubscription(subscription)),
      );
    } finally {
      this.isRunning = false;
    }
  }

  async subscribe(userId: string, botId: string, amount: string, period: string) {
    const bot = await this.tradingBotsService.getActiveById(botId);
    if (bot.isPremium && !(await this.premiumAccessService.hasAccess(userId))) {
      throw new ForbiddenException('Verify a 40 USDT treasury payment to use premium bots.');
    }
    const existing = await this.subscriptionsRepository.findOne({
      where: { user: { id: userId }, bot: { id: botId }, isActive: true },
    });
    if (existing) {
      existing.amount = amount;
      existing.period = period;
      existing.nextRunAt = new Date();
      return this.toView(await this.subscriptionsRepository.save(existing));
    }

    const subscription = await this.subscriptionsRepository.save(
      this.subscriptionsRepository.create({
        user: { id: userId } as any,
        bot: { id: botId } as any,
        amount,
        period,
        isActive: true,
        nextRunAt: new Date(),
      }),
    );
    return this.toView(subscription);
  }

  async stop(userId: string, subscriptionId: string) {
    const result = await this.subscriptionsRepository
      .createQueryBuilder()
      .update(BotSubscription)
      .set({ isActive: false })
      .where('id = :subscriptionId', { subscriptionId })
      .andWhere('userId = :userId', { userId })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Bot subscription not found.');
    }

    const stopped = await this.subscriptionsRepository.findOne({
      where: { id: subscriptionId },
      relations: { bot: true },
    });
    return this.toView(stopped!);
  }

  async list(userId: string) {
    const subscriptions = await this.subscriptionsRepository.find({
      where: { user: { id: userId } },
      relations: { bot: true },
      order: { createdAt: 'DESC' },
    });
    return subscriptions.map(subscription => this.toView(subscription));
  }

  async getStatus(userId: string, subscriptionId: string) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } },
      relations: { bot: true },
    });
    if (!subscription) {
      throw new NotFoundException('Bot subscription not found.');
    }
    return this.toView(subscription);
  }

  async getBotSubscriptionStatus(userId: string, botId: string) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { user: { id: userId }, bot: { id: botId } },
      relations: { bot: true },
      order: { createdAt: 'DESC' },
    });

    const isSubscribed = Boolean(subscription?.isActive);
    return {
      botId,
      isSubscribed,
      status: isSubscribed ? 'ACTIVE' : 'STOPPED',
      ...(isSubscribed ? {} : { treasuryAddress: this.premiumAccessService.getPaymentInfo().treasuryAddress }),
      subscription: subscription ? this.toView(subscription) : null,
    };
  }

  private toView(subscription: BotSubscription) {
    return {
      ...subscription,
      status: subscription.isActive ? 'ACTIVE' : 'STOPPED',
    };
  }

  private async executeSubscription(subscription: BotSubscription): Promise<void> {
    // Re-evaluate every minute so a bot can open several trades while an
    // earlier trade is still inside its selected settlement period.
    const claimed = await this.subscriptionsRepository
      .createQueryBuilder()
      .update(BotSubscription)
      .set({ nextRunAt: new Date(Date.now() + 60 * 1000) })
      .where('id = :id', { id: subscription.id })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();
    if (!claimed.affected) return;

    try {
      const wallet = await this.walletRepository.findOne({
        where: { user: { id: subscription.user.id } },
      });
      const balance = Number(wallet?.amount ?? 0);
      const stake = Number(subscription.amount);

      if (!wallet || !Number.isFinite(balance) || !Number.isFinite(stake) || balance < stake) {
        await this.stopForInsufficientBalance(subscription, balance, stake);
        return;
      }

      await this.betsService.createBet(
        {
          Period: subscription.period,
          Amount: subscription.amount,
          botId: subscription.bot.id,
          isVatual: false,
          tradeCount: 1,
        },
        subscription.user.id,
      );
      this.logger.log(`Bot ${subscription.bot.name} placed a trade for user ${subscription.user.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('insufficient balance')) {
        const balance = await this.getBalance(subscription.user.id);
        await this.stopForInsufficientBalance(subscription, balance, Number(subscription.amount));
        return;
      }
      this.logger.warn(`Bot subscription ${subscription.id} skipped: ${message}`);
    }
  }

  private async getBalance(userId: string): Promise<number> {
    const wallet = await this.walletRepository.findOne({
      where: { user: { id: userId } },
    });
    return Number(wallet?.amount ?? 0);
  }

  private async stopForInsufficientBalance(
    subscription: BotSubscription,
    balance: number,
    stake: number,
  ): Promise<void> {
    subscription.isActive = false;
    await this.subscriptionsRepository.save(subscription);
    this.logger.warn(
      `Bot subscription ${subscription.id} stopped: balance ${balance.toFixed(8)} is below stake ${stake.toFixed(8)}`,
    );
  }

}
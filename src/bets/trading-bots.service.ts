import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingBot, TradingBotStrategy } from './entities/trading-bot.entity';
import { Direction } from './entities/signal.interval';
import { PriceService } from './price.service';

@Injectable()
export class TradingBotsService {
  constructor(
    @InjectRepository(TradingBot)
    private readonly botsRepository: Repository<TradingBot>,
    private readonly priceService: PriceService,
  ) {}

  async listActive() {
    await this.ensureDefaults();
    return this.botsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'description', 'symbol', 'strategy', 'interval', 'isActive', 'isPremium'],
    });
  }

  async getActiveById(id: string): Promise<TradingBot> {
    await this.ensureDefaults();
    const bot = await this.botsRepository.findOne({ where: { id, isActive: true } });
    if (!bot) throw new NotFoundException('Trading bot not found or inactive.');
    return bot;
  }

  async analyze(bot: TradingBot): Promise<Direction> {
    return this.priceService.getBotDirection(bot.symbol, bot.interval, bot.strategy);
  }

  async getAnalysis(id: string, limit?: number) {
    const bot = await this.getActiveById(id);
    return this.priceService.getBotAnalysis(bot.symbol, bot.interval, bot.strategy, limit);
  }

  private async ensureDefaults(): Promise<void> {
    const defaults = [
      {
        name: 'BTC Momentum',
        description: 'Follows short-term momentum from recent Binance candles.',
        symbol: 'BTCUSDT',
        strategy: TradingBotStrategy.momentum,
        interval: '5m',
        isActive: true,
        isPremium: false,
      },
      {
        name: 'BTC Mean Reversion',
        description: 'Looks for price moves that are extended from the recent average.',
        symbol: 'BTCUSDT',
        strategy: TradingBotStrategy.meanReversion,
        interval: '15m',
        isActive: true,
        isPremium: false,
      },
      {
        name: 'ETH Momentum Pro',
        description: 'Premium momentum strategy for ETH using recent Binance candles.',
        symbol: 'ETHUSDT',
        strategy: TradingBotStrategy.momentum,
        interval: '5m',
        isActive: true,
        isPremium: true,
      },
      {
        name: 'BTC Mean Reversion Pro',
        description: 'Premium BTC reversion strategy for extended market moves.',
        symbol: 'BTCUSDT',
        strategy: TradingBotStrategy.meanReversion,
        interval: '15m',
        isActive: true,
        isPremium: true,
      },
      {
        name: 'SOL Momentum Pro',
        description: 'Premium SOL momentum strategy using short-term market movement.',
        symbol: 'SOLUSDT',
        strategy: TradingBotStrategy.momentum,
        interval: '5m',
        isActive: true,
        isPremium: true,
      },
      {
        name: 'ETH Mean Reversion Pro',
        description: 'Premium ETH strategy seeking reversals from its recent average.',
        symbol: 'ETHUSDT',
        strategy: TradingBotStrategy.meanReversion,
        interval: '15m',
        isActive: true,
        isPremium: true,
      },
      {
        name: 'Multi-Asset Breakout Pro',
        description: 'Premium BTC breakout strategy for high-momentum candle moves.',
        symbol: 'BTCUSDT',
        strategy: TradingBotStrategy.momentum,
        interval: '30m',
        isActive: true,
        isPremium: true,
      },
    ];

    for (const config of defaults) {
      const existing = await this.botsRepository.findOne({ where: { name: config.name } });
      if (!existing) await this.botsRepository.save(this.botsRepository.create(config));
    }
  }
}
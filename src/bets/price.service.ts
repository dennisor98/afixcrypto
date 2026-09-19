/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Direction } from './entities/signal.interval';
import { TradingBotStrategy } from './entities/trading-bot.entity';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly TICKER_URL = 'https://api.binance.com/api/v3/ticker/price';

  async getBtcUsdtPrice(): Promise<number> {
    return this.getPrice('BTCUSDT');
  }

  async getPrice(symbol: string): Promise<number> {
    try {
      const res = await fetch(`${this.TICKER_URL}?symbol=${symbol}`);
      if (!res.ok) {
        throw new Error(`Binance responded ${res.status}`);
      }
      const data = (await res.json()) as { price?: string };
      const price = parseFloat(data.price ?? '');
      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid price payload: ${JSON.stringify(data)}`);
      }
      return price;
    } catch (err: any) {
      this.logger.error(`Failed to fetch ${symbol} price: ${err.message}`);
      throw new HttpException(
        'Unable to fetch market price right now, please try again',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getBotDirection(
    symbol: string,
    interval: string,
    strategy: TradingBotStrategy,
  ): Promise<Direction> {
    const analysis = await this.getBotAnalysis(symbol, interval, strategy);
    return analysis.direction;
  }

  async getBotAnalysis(
    symbol: string,
    interval: string,
    strategy: TradingBotStrategy,
    limit = 50,
  ) {
    try {
      const requestedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 50;
      const safeLimit = Math.min(Math.max(requestedLimit, 20), 100);
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${safeLimit}`,
      );
      if (!response.ok) throw new Error(`Binance responded ${response.status}`);

      const candles = (await response.json()) as Array<Array<string | number>>;
      const points = candles
        .map(candle => ({
          time: Number(candle[0]),
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          volume: Number(candle[5]),
        }))
        .filter(point => Object.values(point).every(Number.isFinite));
      if (points.length < 20) throw new Error('Not enough candle data');

      const closes = points.map(point => point.close);
      const latest = closes[closes.length - 1];
      const previous = closes[closes.length - 2];
      const average = closes.reduce((sum, value) => sum + value, 0) / closes.length;
      const momentumPercent = ((latest - previous) / previous) * 100;

      const direction = strategy === TradingBotStrategy.meanReversion
        ? latest >= average ? Direction.Bearish : Direction.Bullish
        : latest >= previous ? Direction.Bullish : Direction.Bearish;

      return {
        symbol,
        interval,
        strategy,
        direction,
        generatedAt: new Date().toISOString(),
        latestPrice: latest,
        movingAverage: average,
        momentumPercent,
        candles: points,
      };
    } catch (err: any) {
      this.logger.error(`Failed to analyze ${symbol} market data: ${err.message}`);
      throw new HttpException(
        'Unable to analyze market data right now, please try again',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
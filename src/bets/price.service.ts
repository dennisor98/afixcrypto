/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

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
}
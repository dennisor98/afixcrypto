import { DefaultEntity } from 'src/entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Bet } from './bet.entity';

export enum TradingBotStrategy {
  momentum = 'momentum',
  meanReversion = 'mean_reversion',
}

@Entity('trading_bot')
export class TradingBot extends DefaultEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 20, default: 'BTCUSDT' })
  symbol: string;

  @Column({ type: 'enum', enum: TradingBotStrategy })
  strategy: TradingBotStrategy;

  @Column({ length: 10, default: '5m' })
  interval: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @OneToMany(() => Bet, bet => bet.bot)
  bets: Bet[];
}
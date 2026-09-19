/* eslint-disable prettier/prettier */
import { DefaultEntity } from 'src/entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Signals } from './signal.interval';
import { User } from 'src/user/entities/user.entity';
import { TradingBot } from './trading-bot.entity';

export enum type {
  Bearish = 'fall',
  Bullish = 'rise',
}

export enum state {
  won = 'won',
  loss = 'loss',
  pending = 'pending',
}

export enum BetTradeType {
  regular = 'regular',
  twentyFourHour = '24h',
}

@Entity()
export class Bet extends DefaultEntity {

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  betAmount: string;

  @Column({ default: false })
  isVirtual: boolean;

  @Column()
  betType: string;

  @Column({ length: 20, default: 'BTCUSDT' })
  marketSymbol: string;

  @ManyToOne(() => TradingBot, bot => bot.bets, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'botId' })
  bot: TradingBot | null;

  @Column({ type: 'enum', enum: BetTradeType, default: BetTradeType.regular })
  tradeType: BetTradeType;

  // Percentage return captured when a fixed-return trade is placed.
  @Column({ type: 'decimal', precision: 7, scale: 4, nullable: true })
  returnRate: string | null;

  @Column({ type: 'enum', enum: state })
  status: state;

  @Column({ type: 'enum', enum: state })
  projectedstatus: state;

  // BTC price captured when the trade was placed
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  startPrice: string;

  // BTC price captured at settlement; decides win or loss
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  endPrice: string;

  @Column({ type: 'timestamp', nullable: true })
  settleAt: Date;

  @ManyToOne(() => User, user => user.bets)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Signals, sign => sign.bets)
  @JoinColumn({ name: 'signalId' })
  signal: Signals;
}
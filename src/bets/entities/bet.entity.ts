/* eslint-disable prettier/prettier */
import { DefaultEntity } from 'src/entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Signals } from './signal.interval';
import { User } from 'src/user/entities/user.entity';

export enum type {
  Bearish = 'fall',
  Bullish = 'rise',
}

export enum state {
  won = 'won',
  loss = 'loss',
  pending = 'pending',
}

@Entity()
export class Bet extends DefaultEntity {

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  betAmount: string;

  @Column({ default: false })
  isVirtual: boolean;

  @Column()
  betType: string;

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
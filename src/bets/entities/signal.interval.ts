/* eslint-disable prettier/prettier */
import { DefaultEntity } from 'src/entity';

import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { Bet } from './bet.entity';
import { User } from 'src/user/entities/user.entity';
import { signal_Hour } from './signal.entity';

export enum Direction {
  Bearish = 'fall',
  Bullish = 'rise',
}
@Entity()
export class Signals extends DefaultEntity {
  @Column()
  period_time: string;
  // @Column()
  // trade_time: string;

  @Column()
  endtime: number;

  @Column()
  start_time: number;

  @Column({
    type: 'enum',
    enum: Direction,
    default: Direction.Bearish,
  })
  direction: Direction;
  // @Column()
  // no: string;
  // @Column()
  // stage: number;

  @ManyToMany(() => User, user => user.signals)
  users: User[];

  @OneToMany(() => Bet, bet => bet.signal)
  bets: Bet[];
  @ManyToOne(() => signal_Hour, sign => sign.signals)
  @JoinColumn({ name: 'hourId' })
  hour: signal_Hour;


}


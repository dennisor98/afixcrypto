/* eslint-disable prettier/prettier */
import { DefaultEntity } from 'src/entity';

import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { Bet } from './bet.entity';
import { Signals } from './signal.interval';

@Entity()
export class signal_Hour extends DefaultEntity {
    @Column({nullable:true})
    Dayhour: string;

    @Column({nullable:true})
    interval: string;
   


  @OneToMany(() => Signals, sign => sign.hour)
  signals: Signals[];
 
}


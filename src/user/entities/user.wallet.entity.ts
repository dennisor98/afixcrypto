/* eslint-disable prettier/prettier */
import { DefaultEntity } from "src/entity";
import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Wallet extends DefaultEntity {

  // Decimal rather than varchar so money arithmetic is exact
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  amount: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  flows: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  virtualamount: string;

  @Index()
  @OneToOne(() => User)
  @JoinColumn()
  user: User;
}
import { DefaultEntity } from "src/entity";
import { TronwalletDeposits } from "src/tronwallet/entities/tronwallet.entity";
import { Column, JoinColumn, JoinTable, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { Entity } from "typeorm/decorator/entity/Entity";
import { Wallet } from "./user.wallet.entity";
import { ReferralBonus } from "src/referral/entities/bonus.entity";
import { Referrer } from "src/referral/entities/referral.entity";
import { WithdrawalRequests } from "src/tronwallet/entities/withdrawal.request.entity";
import { Bet } from "src/bets/entities/bet.entity";
import { Signals } from "src/bets/entities/signal.interval";



@Entity()
export class User extends DefaultEntity {

  @Column({ nullable: true })
  userName: string;

  @Column({ unique: true, type: String })
  email: string;


  @Column({ unique: true, type: String })
  privateKey: string;

  @Column({ unique: true, type: String })
  publicKey: string;

  @Column({ unique: true, type: String })
  address: string;
  @Column({ default: false })
  isEmailConfirmed: boolean;
  @Column()
  password: string;

  @Column({ nullable: true })
  emailotp: string;
  @Column({ unique: true })
  referralCode: string; // Add the referral code field here

  @Column({ default: false })
  hasMadeFirstDeposit: boolean;
  @Column({ default: false })
  isblocked: boolean;
  @OneToMany(() => TronwalletDeposits, (depo) => depo.user)
  deposits: TronwalletDeposits[];
    @OneToOne(() => Wallet,wallet=>wallet.user)
  @JoinColumn()
  wallet: Wallet
  @OneToMany(() => WithdrawalRequests, (withd) => withd.user)
  withdrawalsRequest: WithdrawalRequests[];
  @OneToOne(() => ReferralBonus, referralBonus => referralBonus.user) // One-to-one relationship with ReferralBonus
  @JoinColumn({ name: 'referral_bonus_id' }) // Foreign key column name in the User table
  referralBonus: ReferralBonus;
  @ManyToOne(() => Referrer, referrer => referrer.referredUser) // Many-to-one relationship with Referrer for referred users
  @JoinTable({ name: 'reffered_users' }) // Foreign key column name in the User table
  referredUsers: Referrer[];
  @OneToMany(() => Bet, bet => bet.user)
  bets: Bet[];
  @JoinTable()
  signals: Signals[];

  @Column({ default: 'user' }) // Set default role as 'user'
  roles: string; // 'user' or 'admin'

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ nullable: true, type: 'text' })
  twoFactorSecret: string | null;

  @Column({ nullable: true, type: 'varchar', length: 10 })
  loginOtp: string | null;

  @Column({ type: 'timestamp', nullable: true })
  loginOtpExpiry: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiry: Date | null;

}



import { DefaultEntity } from 'src/entity';
import { User } from 'src/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

export enum PremiumPaymentStatus {
  verified = 'verified',
}

@Entity('premium_bot_payment')
@Unique('UQ_premium_bot_payment_hash', ['transactionHash'])
export class PremiumBotPayment extends DefaultEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 128 })
  transactionHash: string;

  @Column({ length: 64 })
  fromAddress: string;

  @Column({ length: 64 })
  toAddress: string;

  @Column({ length: 64 })
  tokenContract: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  amount: string;

  @Column({ type: 'timestamp' })
  blockTimestamp: Date;

  @Column({ type: 'enum', enum: PremiumPaymentStatus, default: PremiumPaymentStatus.verified })
  status: PremiumPaymentStatus;

  @Column({ type: 'timestamp' })
  verifiedAt: Date;
}
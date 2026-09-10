import { DefaultEntity } from 'src/entity';
/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Referrer } from './referral.entity';
import { User } from 'src/user/entities/user.entity';

@Entity()
export class ReferralBonus extends DefaultEntity {


  @Column()
  amount: string;

  // One-to-one relationship with User entity for the referred user
  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referredUserId' })
  user: User;

  @Column({ default: 'deposit' })
  comment: string;


}
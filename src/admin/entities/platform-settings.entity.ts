import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('platform_settings')
export class PlatformSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 'main', unique: true })
    key: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.95 })
    payoutMultiplier: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 1 })
    minBet: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 10000 })
    maxBet: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 10 })
    minDeposit: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 10 })
    minWithdrawal: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 1 })
    withdrawalFee: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 1 })
    serviceFee: number;

    @Column({ default: true })
    tradingEnabled: boolean;

    @Column({ default: true })
    depositsEnabled: boolean;

    @Column({ default: true })
    withdrawalsEnabled: boolean;

    @Column({ default: false })
    maintenanceMode: boolean;

    @Column({ type: 'text', nullable: true })
    maintenanceMessage: string | null;

    @Column({ type: 'text', nullable: true })
    systemAnnouncement: string | null;

    @Column({ default: false })
    announcementActive: boolean;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'varchar', length: 36, nullable: true })
    updatedBy: string | null;
}
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('admin_audit_log')
export class AdminAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { eager: true })
    admin: User;

    @Column()
    action: string;

    @Column({ nullable: true })
    targetType: string;

    @Column({ nullable: true })
    targetId: string;

    @Column({ type: 'text', nullable: true })
    details: string;

    @Column({ nullable: true })
    ipAddress: string;

    @CreateDateColumn()
    createdAt: Date;
}
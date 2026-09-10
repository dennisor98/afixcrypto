/* eslint-disable prettier/prettier */
import { DefaultEntity } from 'src/entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export enum NotificationType {
  info = 'info',
  success = 'success',
  warning = 'warning',
  error = 'error',
}

@Entity()
export class Notification extends DefaultEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.info })
  type: NotificationType;

  @Column({ default: false })
  read: boolean;

  // Indexed because every read is scoped to a single user
  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
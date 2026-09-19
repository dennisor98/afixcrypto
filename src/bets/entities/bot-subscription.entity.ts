import { DefaultEntity } from 'src/entity';
import { User } from 'src/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TradingBot } from './trading-bot.entity';

@Entity('bot_subscription')
export class BotSubscription extends DefaultEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => TradingBot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'botId' })
  bot: TradingBot;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: string;

  @Column({ length: 10, default: '5m' })
  period: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp' })
  nextRunAt: Date;
}
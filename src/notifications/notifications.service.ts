/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async createForUser(
    user: User | { id: string },
    title: string,
    message: string,
    type: NotificationType = NotificationType.info,
  ): Promise<Notification> {
    const notification = this.repo.create({
      title,
      message,
      type,
      read: false,
      user: { id: user.id } as User,
    });
    return this.repo.save(notification);
  }

  async findForUser(userId: string, limit = 50): Promise<Notification[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { user: { id: userId }, read: false } });
  }

  // Scoped by userId so one user cannot mark another user's notification read
  async markRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.repo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.read = true;
    return this.repo.save(notification);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo.update(
      { user: { id: userId }, read: false },
      { read: true },
    );
    return { updated: result.affected ?? 0 };
  }
}
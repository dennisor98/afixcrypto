/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';

// Each socket joins a room named after its user id, so events are delivered
// only to the user they concern. Broadcasting with server.emit would send
// every settlement and deposit to every connected client.
function room(userId: string) {
  return `user:${userId}`;
}

@WebSocketGateway({
  namespace: '/notification',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Sockets are authenticated at connection time. An unverified socket is
  // disconnected rather than left in the namespace.
  async handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        socket.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload?.sub;
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      socket.data.userId = userId;
      await socket.join(room(userId));
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    if (socket.data?.userId) {
      this.logger.debug(`Socket disconnected for user ${socket.data.userId}`);
    }
  }

  /** Persists a notification then delivers it to that user only. */
  async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.info,
  ) {
    try {
      const saved = await this.notificationsService.createForUser(
        { id: userId },
        title,
        message,
        type,
      );
      this.server.to(room(userId)).emit('createNotification', saved);
    } catch (err: any) {
      this.logger.error(
        `Failed to notify user ${userId}: ${err?.message}`,
      );
    }
  }

  /** Called when a bet settles. Message reflects the real price outcome. */
  async emitNotification(bet: any) {
    const userId = bet?.user?.id;
    if (!userId) return;

    const stake = parseFloat(bet.betAmount ?? '0').toFixed(2);
    const direction = String(bet.betType ?? '').toUpperCase();

    if (bet.status === 'won') {
      await this.notifyUser(
        userId,
        'Trade won',
        `Your ${direction} trade of $${stake} settled in your favour.`,
        NotificationType.success,
      );
    } else if (bet.status === 'loss') {
      await this.notifyUser(
        userId,
        'Trade lost',
        `Your ${direction} trade of $${stake} did not settle in your favour.`,
        NotificationType.error,
      );
    }
  }

  async emitDeposit(userId: string, amount: number) {
    await this.notifyUser(
      userId,
      'Deposit confirmed',
      `$${amount.toFixed(2)} has been credited to your wallet.`,
      NotificationType.success,
    );
  }

  async emitWithdrawalUpdate(userId: string, status: string, amount: number) {
    await this.notifyUser(
      userId,
      'Withdrawal update',
      `Your withdrawal of $${amount.toFixed(2)} was ${status}.`,
      status === 'approved' ? NotificationType.success : NotificationType.warning,
    );
  }
}
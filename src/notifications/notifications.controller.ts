/* eslint-disable prettier/prettier */
import { Controller, Get, Patch, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('notifications')
@ApiTags('notifications')
@ApiBearerAuth('defaultBearerAuth')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Every route is scoped to req.user.id, never an id from the request
  @Get()
  findMine(@Request() req: any, @Query('limit') limit?: string) {
    return this.notificationsService.findForUser(
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notificationsService.countUnread(req.user.id);
    return { count };
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }
}
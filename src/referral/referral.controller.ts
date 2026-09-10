/* eslint-disable prettier/prettier */
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReferralsService } from './referral.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('referrals')
@ApiTags('referrals')
@ApiBearerAuth('defaultBearerAuth')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // Scaffold CRUD routes were removed: they had no guard and called
  // service methods that do not exist.

  @Get('get/referrals')
  @UseGuards(AuthGuard)
  getMyReferrals(@Request() req: any) {
    // AuthGuard supplies the full user entity, so id is the reliable field
    return this.referralsService.getReferrerStatistics(req.user.id);
  }
}
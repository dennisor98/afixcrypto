import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { SubscribeBotDto } from './dto/subscribe-bot.dto';
import { BotExecutionService } from './bot-execution.service';
import { TradingBotsService } from './trading-bots.service';
import { PremiumAccessService } from 'src/tronwallet/premium-access.service';
import { VerifyPremiumPaymentDto } from './dto/verify-premium-payment.dto';

@Controller('trading-bots')
@ApiTags('trading-bots')
@ApiBearerAuth('defaultBearerAuth')
@UseGuards(AuthGuard)
export class BotExecutionController {
  constructor(
    private readonly executionService: BotExecutionService,
    private readonly tradingBotsService: TradingBotsService,
    private readonly premiumAccessService: PremiumAccessService,
  ) {}

  @Get('subscriptions')
  list(@Request() req: any) {
    return this.executionService.list(req.user.id);
  }

  @Get('premium-access')
  premiumAccess(@Request() req: any) {
    return this.premiumAccessService.getAccess(req.user.id);
  }

  @Get('premium-payment-info')
  premiumPaymentInfo() {
    return this.premiumAccessService.getPaymentInfo();
  }

  @Post('premium-payment')
  verifyPremiumPayment(@Body() dto: VerifyPremiumPaymentDto, @Request() req: any) {
    return this.premiumAccessService.verifyPayment(req.user.id, dto.transactionHash);
  }

  @Post('subscriptions')
  async subscribe(@Body() dto: SubscribeBotDto, @Request() req: any) {
    await this.tradingBotsService.getActiveById(dto.botId);
    return this.executionService.subscribe(req.user.id, dto.botId, dto.Amount, dto.Period);
  }

  @Get('subscriptions/:id')
  status(@Param('id') id: string, @Request() req: any) {
    return this.executionService.getStatus(req.user.id, id);
  }

  @Get('subscriptions/bot/:botId')
  botSubscriptionStatus(@Param('botId') botId: string, @Request() req: any) {
    return this.executionService.getBotSubscriptionStatus(req.user.id, botId);
  }

  @Delete('subscriptions/:id')
  stop(@Param('id') id: string, @Request() req: any) {
    return this.executionService.stop(req.user.id, id);
  }
}
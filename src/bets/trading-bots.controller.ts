import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { TradingBotsService } from './trading-bots.service';

@Controller('trading-bots')
@ApiTags('trading-bots')
@SkipThrottle()
export class TradingBotsController {
  constructor(private readonly tradingBotsService: TradingBotsService) {}

  @Get()
  list() {
    return this.tradingBotsService.listActive();
  }

  @Get(':id/analysis')
  analysis(@Param('id') id: string, @Query('limit') limit?: string) {
    const parsedLimit = limit === undefined ? undefined : Number(limit);
    return this.tradingBotsService.getAnalysis(id, parsedLimit);
  }
}
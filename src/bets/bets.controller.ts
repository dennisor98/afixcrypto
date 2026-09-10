/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';
import { Create_Interval_dto } from './dto/create-interval.dto';
import { updateSignalBetDto } from './dto/update-signal.dto';
import { Signals } from './entities/signal.interval';
import { AdminGuard, AuthGuard } from 'src/auth/auth.guard';

@Controller('trades')
@ApiTags('trades')
@ApiBearerAuth('defaultBearerAuth')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Get('getSignal/:dayhour')
  async getSignalsForDayhour(@Param('dayhour') dayhour: string): Promise<Signals[]> {
    return this.betsService.getSignalsForDayhour(dayhour);
  }

  @UseGuards(AuthGuard)
  @Post('create/bet')
  create(@Body() createBetDto: CreateBetDto, @Request() req: any) {
    // req.user is loaded from the DB by AuthGuard using the verified token
    return this.betsService.createBet(createBetDto, req.user.id);
  }

  @UseGuards(AdminGuard)
  @Post('create/interval')
  createintervals(@Body() create_Interval_dto: Create_Interval_dto) {
    return this.betsService.createintervals(create_Interval_dto);
  }

  @UseGuards(AuthGuard)
  @Get('get_today_signals')
  findTodaySignals() {
    return this.betsService.getSignalsAndSignalHoursForToday();
  }

  @UseGuards(AuthGuard)
  @Get('signal/:id')
  findOneSignal(@Param('id') id: string) {
    return this.betsService.getSignalById(id);
  }

  @UseGuards(AuthGuard)
  @Get('get_intervals')
  findintervals() {
    return this.betsService.getintervals();
  }

  @UseGuards(AuthGuard)
  @Get('get/user/trades')
  findAll(@Request() req: any) {
    return this.betsService.getAllBets(req.user);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.betsService.findOne(+id);
  }

  // Admin only: this endpoint alters signal direction
  @UseGuards(AdminGuard)
  @Patch('changeSignal/:id')
  updatesignal(@Param('id') id: string, @Body() updateBetDto: updateSignalBetDto) {
    return this.betsService.updateSignal(id, updateBetDto);
  }
}
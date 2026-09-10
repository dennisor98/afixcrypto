/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import type { Queue, Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';

import { Bet, state } from 'src/bets/entities/bet.entity';
import { CreateBetDto } from './dto/create-bet.dto';
import { Direction, Signals } from './entities/signal.interval';
import { signal_Hour } from './entities/signal.entity';
import { updateSignalBetDto } from './dto/update-signal.dto';
import { Create_Interval_dto } from './dto/create-interval.dto';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { UserService } from 'src/user/user.service';
import { ReferralsService } from 'src/referral/referral.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { AdminService } from 'src/admin/admin.service';
import { PriceService } from './price.service';

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    @InjectQueue('betQueue') private readonly betQueue: Queue,
    @InjectRepository(Wallet) private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Bet) private readonly betsRepository: Repository<Bet>,
    @InjectRepository(signal_Hour) private readonly signalsInteralRepo: Repository<signal_Hour>,
    @InjectRepository(Signals) private readonly signalRepository: Repository<Signals>,
    private readonly userService: UserService,
    private readonly referralService: ReferralsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly adminService: AdminService,
    private readonly priceService: PriceService,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------
  // Trade placement
  // ---------------------------------------------------------------

  async createBet(createBetDto: CreateBetDto, authUserId: string) {
    // Identity always comes from the verified token, never the request body
    const user = await this.userService.findById(authUserId);

    if (user.isblocked) {
      throw new HttpException('Account is blocked, please contact support.', HttpStatus.FORBIDDEN);
    }
    if (createBetDto.isVatual === true) {
      throw new HttpException('Virtual trading is not supported.', HttpStatus.FORBIDDEN);
    }
    if (user.hasMadeFirstDeposit === false) {
      throw new HttpException('Please make your first deposit before trading.', HttpStatus.FORBIDDEN);
    }

    // Platform limits and kill switches, enforced server side
    const settings = await this.adminService.getSettings();
    if (settings.maintenanceMode) {
      throw new HttpException(
        settings.maintenanceMessage || 'Platform is under maintenance.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!settings.tradingEnabled) {
      throw new HttpException('Trading is currently disabled.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const betAmount = parseFloat(createBetDto.Amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      throw new HttpException('Enter a valid amount greater than 0.', HttpStatus.BAD_REQUEST);
    }
    const minBet = Number(settings.minBet);
    const maxBet = Number(settings.maxBet);
    if (!isNaN(minBet) && betAmount < minBet) {
      throw new HttpException(`Minimum trade is ${minBet} USDT.`, HttpStatus.BAD_REQUEST);
    }
    if (!isNaN(maxBet) && maxBet > 0 && betAmount > maxBet) {
      throw new HttpException(`Maximum trade is ${maxBet} USDT.`, HttpStatus.BAD_REQUEST);
    }

    const periodMinutes = this.parsePeriodMinutes(createBetDto.Period);
    const delayMs = periodMinutes * 60 * 1000;

    // Live BTC price at the moment of placement
    const startPrice = await this.priceService.getBtcUsdtPrice();

    // Best effort link to the current signal window, for reporting only.
    // It does not influence the outcome.
    const currentSignal = await this.tryGetCurrentSignal();

    // Wallet row is locked for the duration of the transaction so that
    // concurrent requests cannot overdraw the balance
    const savedBet = await this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId: user.id })
        .getOne();

      if (!wallet) {
        throw new HttpException('Wallet not found for user.', HttpStatus.NOT_FOUND);
      }

      // Checked inside the lock so two simultaneous trades cannot both pass
      const pending = await manager.getRepository(Bet).count({
        where: { user: { id: user.id }, status: state.pending },
      });
      if (pending > 0) {
        throw new HttpException('You already have an active trade.', HttpStatus.FORBIDDEN);
      }

      const balance = parseFloat(wallet.amount);
      if (betAmount > balance) {
        throw new HttpException('Insufficient balance, please top up.', HttpStatus.FORBIDDEN);
      }

      wallet.amount = (balance - betAmount).toFixed(8);
      await manager.save(wallet);

      const bet = new Bet();
      bet.betAmount = betAmount.toFixed(8);
      bet.betType = createBetDto.direction;
      bet.status = state.pending;
      bet.projectedstatus = state.pending;
      bet.isVirtual = false;
      bet.user = user;
      bet.startPrice = startPrice.toFixed(8);
      bet.settleAt = new Date(Date.now() + delayMs);
      if (currentSignal) {
        bet.signal = currentSignal;
      }

      return manager.save(bet);
    });

    await this.betQueue.add('updateBetStatus', { betId: savedBet.id }, { delay: delayMs });

    return {
      message: 'Trade placed. It will settle at the end of the period.',
      betId: savedBet.id,
      startPrice: savedBet.startPrice,
      settleAt: savedBet.settleAt,
    };
  }

  // ---------------------------------------------------------------
  // Settlement, decided by real BTC price movement
  // ---------------------------------------------------------------

  async updateBetStatus(job: Job<{ betId: string }>) {
    const { betId } = job.data;

    const bet = await this.betsRepository
      .createQueryBuilder('bet')
      .where('bet.id = :betId', { betId: `${betId}` })
      .leftJoinAndSelect('bet.signal', 'signal')
      .leftJoin('bet.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .getOne();

    if (!bet) {
      this.logger.error(`Settlement skipped, bet ${betId} not found`);
      return;
    }

    // Settle each bet only once
    if (bet.status !== state.pending) {
      return;
    }

    let endPrice: number;
    try {
      endPrice = await this.priceService.getBtcUsdtPrice();
    } catch (err) {
      // Requeue rather than dropping the bet, so the user is always settled
      this.logger.error(`Price fetch failed for bet ${betId}, retrying in 30s`);
      await this.betQueue.add('updateBetStatus', { betId }, { delay: 30 * 1000 });
      return;
    }

    const startPrice = parseFloat(bet.startPrice);
    const stake = parseFloat(bet.betAmount);

    const settings = await this.adminService.getSettings();
    const payoutMultiplier = Number(settings.payoutMultiplier) || 1.95;

    bet.endPrice = endPrice.toFixed(8);

    // No movement, return the stake
    if (endPrice === startPrice) {
      bet.status = state.loss;
      bet.projectedstatus = state.loss;
      await this.betsRepository.save(bet);
      await this.creditWallet(bet.user.id, stake);
      await this.notificationsGateway.emitNotification(bet);
      return;
    }

    const rose = endPrice > startPrice;
    const won =
      (bet.betType === Direction.Bullish && rose) ||
      (bet.betType === Direction.Bearish && !rose);

    bet.status = won ? state.won : state.loss;
    bet.projectedstatus = bet.status;
    await this.betsRepository.save(bet);

    if (won) {
      // Multiplier returns the stake plus the profit
      await this.creditWallet(bet.user.id, stake * payoutMultiplier);
    }

    await this.notificationsGateway.emitNotification(bet);
  }

  // Credits a user's real balance inside a locked transaction
  private async creditWallet(userId: string, amount: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) {
        this.logger.error(`Wallet not found for user ${userId} during credit`);
        return;
      }

      wallet.amount = (parseFloat(wallet.amount) + amount).toFixed(8);
      await manager.save(wallet);
    });
  }

  private parsePeriodMinutes(period: string): number {
    const map: Record<string, number> = { '5m': 5, '15m': 15, '30m': 30 };
    return map[period] ?? 5;
  }

  private async tryGetCurrentSignal(): Promise<Signals | null> {
    try {
      const { hour, minute } = await this.getCurrentHourAndMinute();
      return await this.getSignalsForMinute(hour, minute);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------
  // Wallet and bet lookups
  // ---------------------------------------------------------------

  async findByUserId(userId: string): Promise<Wallet | undefined> {
    const wallet = await this.walletRepository
      .createQueryBuilder('wallet')
      .where('wallet.userId = :userId', { userId })
      .getOne();
    return wallet === null ? undefined : wallet;
  }

  async findPendingBetsByUserId(user: any): Promise<Bet[]> {
    return this.betsRepository
      .createQueryBuilder('b')
      .where('b.userId = :userId', { userId: user.id })
      .andWhere('b.status = :status', { status: state.pending })
      .getMany();
  }

  async findBetsByUserId(user: any): Promise<Bet[]> {
    return this.betsRepository
      .createQueryBuilder('b')
      .where('b.userId = :userId', { userId: user.id })
      .getMany();
  }

  async getAllBets(user: any): Promise<Bet[]> {
    // AuthGuard supplies the full user entity, so email is the reliable field
    const email = user?.email ?? user?.username;
    const foundUser = await this.userService.findByEmailbets(email);
    if (!foundUser) {
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    }
    return foundUser.bets;
  }

  // ---------------------------------------------------------------
  // Signals and intervals
  // ---------------------------------------------------------------

  async getSignalsForDayhour(dayhour: string): Promise<Signals[]> {
    const currentDate = new Date().toISOString().split('T')[0];

    return this.signalRepository
      .createQueryBuilder('s')
      .innerJoin('s.hour', 'sh')
      .where('sh.Dayhour = :dayhour', { dayhour })
      .andWhere('DATE(s.createdAt) = :currentDate', { currentDate })
      .orderBy('s.start_time', 'ASC')
      .addOrderBy('s.endtime', 'ASC')
      .getMany();
  }

  async startDailyScheduler(): Promise<void> {
    const createdAt = new Date();
    createdAt.setHours(0, 0, 0, 0);

    const nextDay = new Date(createdAt);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingSignal = await this.signalRepository.find({
      where: { createdAt: Between(createdAt, nextDay) },
    });

    if (existingSignal.length !== 0) {
      return;
    }

    try {
      const hours = await this.getintervals();

      for (const hour of hours) {
        const interval = await this.getIntervalsForHour(parseInt(hour.Dayhour));

        for (const inter of interval.intervals) {
          // Direction is a display placeholder only. Outcomes are settled
          // against live BTC price, not this value.
          const newSignal = this.signalRepository.create({
            direction: this.getRandomDirection(),
            endtime: inter.endMinute,
            hour: hour,
            period_time: '5 mins',
            start_time: inter.startMinute,
          });
          await this.signalRepository.save(newSignal);
        }
      }
    } catch (error) {
      this.logger.error('Error creating daily signals', error);
    }
  }

  async getSignalsForMinute(hour: number, minute: number): Promise<Signals> {
    const formattedDate = new Date().toISOString().split('T')[0];

    const signal = await this.signalRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.hour', 'sh')
      .where('DATE(s.createdAt) = :currentDate', { currentDate: formattedDate })
      .andWhere('sh.Dayhour = :hour', { hour })
      .andWhere('s.start_time <= :minute', { minute })
      .andWhere('s.endtime >= :minute', { minute })
      .orderBy('s.start_time')
      .addOrderBy('s.endtime')
      .getOne();

    if (!signal) {
      throw new Error('No signal found for the given hour and minute.');
    }
    return signal;
  }

  async getSignalById(signalId: string): Promise<any> {
    const today = new Date();

    return this.signalRepository
      .createQueryBuilder('s')
      .select([
        's.id',
        's.createdAt',
        's.direction',
        's.period_time',
        's.start_time',
        's.endtime',
        'sh.interval',
        'sh.Dayhour',
        'COALESCE(SUM(CASE WHEN b.projectedstatus = :wonStatus THEN b.betAmount ELSE 0 END), 0) AS totalWonAmount',
        'COALESCE(SUM(CASE WHEN b.projectedstatus = :lossStatus THEN b.betAmount ELSE 0 END), 0) AS totalLossAmount',
      ])
      .leftJoin('s.bets', 'b')
      .innerJoin('s.hour', 'sh')
      .where('s.id = :signalId', { signalId })
      .andWhere('DATE(s.createdAt) = DATE(:today)', { today })
      .setParameter('wonStatus', 'won')
      .setParameter('lossStatus', 'loss')
      .groupBy('s.id')
      .getRawOne();
  }

  async getSignalsAndSignalHoursForToday(): Promise<any[]> {
    await this.startDailyScheduler();
    const today = new Date();

    return this.signalRepository
      .createQueryBuilder('s')
      .select([
        's.id',
        's.createdAt',
        's.direction',
        's.period_time',
        's.start_time',
        's.endtime',
        'sh.interval',
        'sh.Dayhour',
        'COALESCE(SUM(CASE WHEN b.projectedstatus = :wonStatus THEN CAST(b.betAmount AS DECIMAL(18, 8)) ELSE 0 END), 0) AS totalWonAmount',
        'COALESCE(SUM(CASE WHEN b.projectedstatus = :lossStatus THEN CAST(b.betAmount AS DECIMAL(18, 8)) ELSE 0 END), 0) AS totalLossAmount',
      ])
      .innerJoin('s.hour', 'sh')
      .leftJoin('s.bets', 'b')
      .andWhere('DATE(s.createdAt) = DATE(:today)', { today })
      .setParameter('wonStatus', 'won')
      .setParameter('lossStatus', 'loss')
      .groupBy('s.id')
      .getRawMany();
  }

  async updateSignal(id: string, updateSignalDto: updateSignalBetDto): Promise<any> {
    const signal = await this.signalRepository.findOne({ where: { id } });
    if (!signal) {
      throw new HttpException('Signal not found', HttpStatus.BAD_REQUEST);
    }
    signal.direction = updateSignalDto.direction;
    await this.signalRepository.save(signal);
    return 'Updated Successfully';
  }

  async createintervals(create_Interval_dto: Create_Interval_dto) {
    const signal = new signal_Hour();
    signal.Dayhour = create_Interval_dto.Dayhour;
    signal.interval = create_Interval_dto.interval;
    return this.signalsInteralRepo.save(signal);
  }

  async getintervals(): Promise<signal_Hour[]> {
    return this.signalsInteralRepo.find();
  }

  async getHours(): Promise<any> {
    const hours = await this.signalsInteralRepo.find();
    return hours.map((h) => h.Dayhour);
  }

  async getIntervalsForHour(hourOfDay: number) {
    const intervals = await this.divideIntoIntervals(hourOfDay);
    return { hourOfDay, intervals };
  }

  async divideIntoIntervals(hourOfDay: number): Promise<{ startMinute: number; endMinute: number }[]> {
    const intervals: { startMinute: number; endMinute: number }[] = [];
    const minutesInHour = 60;

    if (hourOfDay >= 0 && hourOfDay <= 23) {
      for (let i = 1; i <= minutesInHour; i += 5) {
        intervals.push({ startMinute: i, endMinute: Math.min(i + 4, minutesInHour) });
      }
    }
    return intervals;
  }

  async getCurrentHourAndMinute(): Promise<{ hour: number; minute: number }> {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  }

  getRandomDirection(): Direction {
    const directions = Object.values(Direction);
    return directions[Math.floor(Math.random() * directions.length)];
  }

  findAll() {
    return `This action returns all bets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bet`;
  }

  remove(id: number) {
    return `This action removes a #${id} bet`;
  }
}
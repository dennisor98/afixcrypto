/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Signals } from './entities/signal.interval';
import { BetsService } from './bets.service';
import { signal_Hour } from './entities/signal.entity';

@Injectable()
export class DailySchedulerService  {
  constructor(
    @InjectRepository(signal_Hour)
    private readonly signalsInteralRepo: Repository<signal_Hour>,
    @InjectRepository(Signals)
    private readonly signalRepository: Repository<Signals>,
    private readonly betsService: BetsService,
  ) { }

//@Cron('0 6 * * *') 
@Cron('0 0 * * *', { timeZone: 'UTC' })



 async startDailyScheduler(): Promise<void> {
  console.log("Setting up signals")
  const createdAt = new Date();
  createdAt.setHours(0, 0, 0, 0);

  const nextDay = new Date(createdAt);
  nextDay.setDate(nextDay.getDate() + 1);
  const existingSignal = await this.signalRepository.find({
    where: {
      createdAt: Between(createdAt, nextDay),
    },



  });
  console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr")
  console.log(nextDay)
  console.log(existingSignal)
  console.log(existingSignal.length == 0)


  try {





    if (existingSignal.length == 0) {
      const hours = await this.betsService.getintervals();
      console.log(hours)


      for (const hour of hours) {
        console.log(hour.Dayhour);
        const interval = await this.betsService.getIntervalsForHour(
          parseInt(hour.Dayhour),
        );
        const intervallist = interval.intervals;
        console.log(intervallist);
        for (const inter of intervallist) {

          const start_time = inter.startMinute;
          const end_time = inter.endMinute;
          const direction = this.betsService.getRandomDirection();

          // If signal does not exist, create and save a new signal
          const newSignal = this.signalRepository.create({
            direction: direction,
            endtime: end_time,
            hour: hour,
            period_time: '5 mins',
            start_time: start_time,

          });







          await this.signalRepository.save(newSignal);


          //  else {
          //   // If signal does not exist, create and save a new signal
          //   const newSignal = this.signalRepository.create({
          //     direction: direction,
          //     endtime: end_time,
          //     hour: hour,
          //     period_time: '5 mins',
          //     start_time: start_time,
          //   });
          //   await this.signalRepository.save(newSignal);
          // }
        }

      }
    }
  } catch (error) {
    console.error('Error executing scheduled task:', error);
  }
}






  // onModuleInit(): void {
  //   // Start the daily scheduler when the module is initialized
  //   this.startDailyScheduler();
  // }

  
}
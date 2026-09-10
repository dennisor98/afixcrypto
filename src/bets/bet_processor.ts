/* eslint-disable prettier/prettier */
import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import type { Job } from "bull";
import { BetsService } from "./bets.service";

@Injectable()
@Processor('betQueue')
export class BetProcessor {
  constructor(private readonly betService: BetsService) {}

  // Only the bet id is passed; the outcome is computed at settlement time
  @Process('updateBetStatus')
  async updateBetStatus(job: Job<{ betId: string }>) {
    await this.betService.updateBetStatus(job);
  }
}
/* eslint-disable prettier/prettier */
import { Process, Processor } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bull";
import { BetsService } from "./bets.service";

@Injectable()
@Processor('betQueue')
export class BetProcessor {
  private readonly logger = new Logger(BetProcessor.name);

  constructor(private readonly betService: BetsService) {}

  // Only the bet id is passed; the outcome is computed at settlement time
  @Process('updateBetStatus')
  async updateBetStatus(job: Job<{ betId: string }>) {
    const { betId } = job.data;
    this.logger.log(
      `Processing settlement job ${job.id} for bet ${betId} (attempt ${job.attemptsMade + 1})`,
    );

    try {
      await this.betService.updateBetStatus(job);
      this.logger.log(`Settlement job ${job.id} finished for bet ${betId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Settlement job ${job.id} failed for bet ${betId}: ${message}`);
      throw error;
    }
  }
}
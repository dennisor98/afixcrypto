import { ConflictException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { PremiumBotPayment, PremiumPaymentStatus } from './entities/premium-bot-payment.entity';

type TransferEvent = {
  transaction_id?: string;
  contract_address?: string;
  result?: { 0?: string; 1?: string };
  decoded?: { from?: string; to?: string; value?: string };
  block_timestamp?: number;
};

@Injectable()
export class PremiumAccessService {
  private readonly logger = new Logger(PremiumAccessService.name);

  constructor(
    @InjectRepository(PremiumBotPayment)
    private readonly paymentsRepository: Repository<PremiumBotPayment>,
    private readonly configService: ConfigService,
  ) {}

  async verifyPayment(userId: string, transactionHash: string) {
    const hash = String(transactionHash ?? '').trim();
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      throw new HttpException('Enter a valid TRON transaction hash.', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.paymentsRepository.findOne({
      where: { transactionHash: hash },
      relations: { user: true },
    });
    if (existing) {
      if (existing.user?.id === userId) return this.toView(existing);
      throw new ConflictException('This transaction has already been used.');
    }

    const treasury = this.configService.get<string>('TRON_MONITORED_ADDRESS')?.trim();
    const contract = this.configService.get<string>('TRON_USDT_CONTRACT')?.trim();
    const baseUrl = this.configService.get<string>('TRON_GRID_API_BASE') || 'https://api.trongrid.io';
    const apiKey = this.configService.get<string>('TRON_PRO_API_KEY');
    if (!treasury || !contract || !apiKey) {
      throw new HttpException('Premium payment verification is not configured.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await fetch(
        `${baseUrl}/v1/transactions/${hash}/events?event_name=Transfer&only_confirmed=true&limit=200`,
        { headers: { 'TRON-PRO-API-KEY': apiKey, accept: 'application/json' } },
      );
      if (!response.ok) throw new Error(`TRON Grid responded ${response.status}`);
      const payload = (await response.json()) as { data?: TransferEvent[] };
      const event = (payload.data ?? []).find(item => item.transaction_id?.toLowerCase() === hash.toLowerCase());
      const transfer = event?.decoded;
      const blockTimestamp = event?.block_timestamp;
      const amount = Number(transfer?.value ?? 0) / 1_000_000;
      const maxAgeDays = Number(this.configService.get<string>('PREMIUM_PAYMENT_MAX_AGE_DAYS') ?? 7);
      const minimumTimestamp = Date.now() - (Number.isFinite(maxAgeDays) ? maxAgeDays : 7) * 24 * 60 * 60 * 1000;

      if (
        !event ||
        event.contract_address?.toLowerCase() !== contract.toLowerCase() ||
        transfer?.to !== treasury ||
        !transfer.from ||
        !Number.isFinite(amount) ||
        amount < 40 ||
        !blockTimestamp ||
        blockTimestamp < minimumTimestamp
      ) {
        throw new HttpException('Transaction is not a recent confirmed 40 USDT payment to the treasury.', HttpStatus.BAD_REQUEST);
      }

      const payment = await this.paymentsRepository.save(this.paymentsRepository.create({
        user: { id: userId } as any,
        transactionHash: hash,
        fromAddress: transfer.from,
        toAddress: transfer.to,
        tokenContract: event.contract_address,
        amount: amount.toFixed(6),
        blockTimestamp: new Date(blockTimestamp),
        status: PremiumPaymentStatus.verified,
        verifiedAt: new Date(),
      }));
      return this.toView(payment);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Premium transaction verification failed for ${hash}: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException('Unable to verify the transaction right now.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async hasAccess(userId: string): Promise<boolean> {
    return (await this.paymentsRepository.count({ where: { user: { id: userId }, status: PremiumPaymentStatus.verified } })) > 0;
  }

  async getAccess(userId: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { user: { id: userId }, status: PremiumPaymentStatus.verified },
      order: { verifiedAt: 'ASC' },
    });
    return { hasPremiumAccess: Boolean(payment), payment: payment ? this.toView(payment) : null };
  }

  getPaymentInfo() {
    const treasuryAddress = this.configService.get<string>('TRON_MONITORED_ADDRESS')?.trim();
    if (!treasuryAddress) {
      throw new HttpException('Premium payment information is not configured.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {
      amount: 40,
      asset: 'USDT',
      network: 'TRC20',
      treasuryAddress,
    };
  }

  private toView(payment: PremiumBotPayment) {
    return {
      transactionHash: payment.transactionHash,
      amount: payment.amount,
      status: payment.status,
      verifiedAt: payment.verifiedAt,
      blockTimestamp: payment.blockTimestamp,
    };
  }
}
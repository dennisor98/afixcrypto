import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from 'src/admin/entities/platform-settings.entity';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(PlatformSettings) private repo: Repository<PlatformSettings>,
    ) {}

    async get(): Promise<PlatformSettings> {
        let settings = await this.repo.findOne({ where: { key: 'main' } });
        if (!settings) {
            settings = await this.repo.save(this.repo.create({ key: 'main' }));
        }
        return settings;
    }

    async assertTradingEnabled() {
        const s = await this.get();
        if (s.maintenanceMode) {
            throw new HttpException(s.maintenanceMessage || 'Platform under maintenance', HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (!s.tradingEnabled) {
            throw new HttpException('Trading is currently disabled', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    async assertDepositsEnabled() {
        const s = await this.get();
        if (s.maintenanceMode) {
            throw new HttpException(s.maintenanceMessage || 'Platform under maintenance', HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (!s.depositsEnabled) {
            throw new HttpException('Deposits are currently disabled', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    async assertWithdrawalsEnabled() {
        const s = await this.get();
        if (s.maintenanceMode) {
            throw new HttpException(s.maintenanceMessage || 'Platform under maintenance', HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (!s.withdrawalsEnabled) {
            throw new HttpException('Withdrawals are currently disabled', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    async validateBetAmount(amount: number) {
        const s = await this.get();
        if (amount < Number(s.minBet)) {
            throw new HttpException(`Minimum bet is ${s.minBet} USDT`, HttpStatus.BAD_REQUEST);
        }
        if (amount > Number(s.maxBet)) {
            throw new HttpException(`Maximum bet is ${s.maxBet} USDT`, HttpStatus.BAD_REQUEST);
        }
    }
}
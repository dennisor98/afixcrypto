import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminService } from './admin.service';

@Controller('settings')
@SkipThrottle()
export class PublicSettingsController {
    constructor(private readonly adminService: AdminService) {}

    @Get('public')
    async getPublic() {
        const s = await this.adminService.getSettings();
        return {
            payoutMultiplier: s.payoutMultiplier,
            dailyTradeReturnRate: s.dailyTradeReturnRate,
            minBet: s.minBet,
            maxBet: s.maxBet,
            minDeposit: s.minDeposit,
            minWithdrawal: s.minWithdrawal,
            withdrawalFee: s.withdrawalFee,
            serviceFee: s.serviceFee,
            tradingEnabled: s.tradingEnabled,
            depositsEnabled: s.depositsEnabled,
            withdrawalsEnabled: s.withdrawalsEnabled,
            maintenanceMode: s.maintenanceMode,
            maintenanceMessage: s.maintenanceMessage,
            systemAnnouncement: s.announcementActive ? s.systemAnnouncement : null,
        };
    }
}
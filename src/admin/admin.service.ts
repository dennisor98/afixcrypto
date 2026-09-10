import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlatformSettings } from './entities/platform-settings.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { User } from 'src/user/entities/user.entity';
import { Wallet } from 'src/user/entities/user.wallet.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(PlatformSettings) private settingsRepo: Repository<PlatformSettings>,
        @InjectRepository(AdminAuditLog) private auditRepo: Repository<AdminAuditLog>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
        private readonly dataSource: DataSource,
    ) {}

    async getSettings(): Promise<PlatformSettings> {
        let settings = await this.settingsRepo.findOne({ where: { key: 'main' } });
        if (!settings) {
            settings = await this.settingsRepo.save(this.settingsRepo.create({ key: 'main' }));
        }
        return settings;
    }

    async updateSettings(updates: Partial<PlatformSettings>, adminId: string) {
        const settings = await this.getSettings();
        Object.assign(settings, updates);
        settings.updatedBy = adminId;
        const saved = await this.settingsRepo.save(settings);
        await this.logAction(adminId, 'UPDATE_SETTINGS', 'PlatformSettings', saved.id, JSON.stringify(updates));
        return saved;
    }

    async adjustUserBalance(
        adminId: string,
        userId: string,
        amount: number,
        type: 'credit' | 'debit',
        reason: string,
    ) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new HttpException('Amount must be greater than 0', HttpStatus.BAD_REQUEST);
        }
        if (!reason || !reason.trim()) {
            throw new HttpException('A reason is required for balance adjustments', HttpStatus.BAD_REQUEST);
        }

        // Locked so an adjustment cannot race a trade or withdrawal
        const result = await this.dataSource.transaction(async (manager) => {
            const wallet = await manager
                .getRepository(Wallet)
                .createQueryBuilder('w')
                .setLock('pessimistic_write')
                .where('w.userId = :userId', { userId })
                .getOne();

            if (!wallet) throw new NotFoundException('Wallet not found');

            const currentBalance = parseFloat(wallet.amount);
            if (!Number.isFinite(currentBalance)) {
                throw new HttpException('Wallet balance is invalid', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

            if (newBalance < 0) {
                throw new HttpException('Insufficient balance for debit', HttpStatus.BAD_REQUEST);
            }

            wallet.amount = newBalance.toFixed(8);
            await manager.save(wallet);

            return { currentBalance, newBalance };
        });

        await this.logAction(
            adminId,
            `BALANCE_${type.toUpperCase()}`,
            'Wallet',
            userId,
            `${type === 'credit' ? '+' : '-'}${amount.toFixed(8)} USDT - Reason: ${reason}`,
        );

        return {
            success: true,
            oldBalance: result.currentBalance,
            newBalance: result.newBalance,
            amount,
            type,
        };
    }

    async setUserRole(adminId: string, userId: string, role: string) {
        if (!['user', 'admin', 'super_admin'].includes(role)) {
            throw new HttpException('Invalid role', HttpStatus.BAD_REQUEST);
        }
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Prevent demoting the last super admin
        if (user.roles === 'super_admin' && role !== 'super_admin') {
            const superAdminCount = await this.userRepo.count({ where: { roles: 'super_admin' } });
            if (superAdminCount <= 1) {
                throw new HttpException('Cannot demote the last super admin', HttpStatus.BAD_REQUEST);
            }
        }

        const oldRole = user.roles;
        user.roles = role;
        await this.userRepo.save(user);

        await this.logAction(adminId, 'CHANGE_ROLE', 'User', userId, `${oldRole} → ${role}`);
        return { success: true, oldRole, newRole: role };
    }

    async resetUser2FA(adminId: string, userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.loginOtp = null;
        user.loginOtpExpiry = null;
        await this.userRepo.save(user);

        await this.logAction(adminId, 'RESET_2FA', 'User', userId, '2FA disabled by admin');
        return { success: true };
    }

    async forceLogoutUser(adminId: string, userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Update passwordChangedAt to invalidate existing JWTs
        // (only works if AuthGuard checks this — see note below)
        user.passwordChangedAt = new Date();
        await this.userRepo.save(user);

        await this.logAction(adminId, 'FORCE_LOGOUT', 'User', userId, 'Forced logout');
        return { success: true };
    }

    async verifyUserEmail(adminId: string, userId: string, verified: boolean) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.isEmailConfirmed = verified;
        await this.userRepo.save(user);

        await this.logAction(adminId, verified ? 'VERIFY_EMAIL' : 'UNVERIFY_EMAIL', 'User', userId, '');
        return { success: true };
    }

    async setFirstDepositStatus(adminId: string, userId: string, hasDeposit: boolean) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.hasMadeFirstDeposit = hasDeposit;
        await this.userRepo.save(user);

        await this.logAction(adminId, 'SET_FIRST_DEPOSIT', 'User', userId, `hasMadeFirstDeposit = ${hasDeposit}`);
        return { success: true };
    }

    async logAction(adminId: string, action: string, targetType: string, targetId: string, details: string) {
        const admin = await this.userRepo.findOne({ where: { id: adminId } });
        if (!admin) return;

        const log = this.auditRepo.create({
            admin,
            action,
            targetType,
            targetId,
            details,
        });
        await this.auditRepo.save(log);
    }

    async getAuditLog(limit = 100, offset = 0) {
        return this.auditRepo.find({
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    async getAllAdmins() {
        const admins = await this.userRepo.find({
            where: [
                { roles: 'admin' },
                { roles: 'super_admin' },
            ],
            order: { createdAt: 'DESC' },
        });
        // Strip sensitive fields
        return admins.map(({ password, privateKey, publicKey, loginOtp, twoFactorSecret, ...admin }) => admin);
    }
}
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly configService: ConfigService,
    ) {}

    async onApplicationBootstrap() {
        await this.seedSuperAdmin();
    }

    private async seedSuperAdmin() {
        const email = this.configService.get<string>('SUPER_ADMIN_EMAIL');
        const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
        const userName = this.configService.get<string>('SUPER_ADMIN_USERNAME') || 'superadmin';

        if (!email || !password) {
            console.log('SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set — skipping super admin seed');
            return;
        }

        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            if (existing.roles !== 'super_admin') {
                existing.roles = 'super_admin';
                await this.userRepo.save(existing);
                console.log(`Upgraded ${email} to super_admin`);
            }
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = this.userRepo.create({
            email,
            userName,
            password: hashedPassword,
            roles: 'super_admin',
            isEmailConfirmed: true,
            hasMadeFirstDeposit: true,
            referralCode: 'SUPER' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        });
        await this.userRepo.save(user);
        console.log(`Super admin created: ${email}`);
    }
}
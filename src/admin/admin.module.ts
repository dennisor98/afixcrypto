import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PlatformSettings } from './entities/platform-settings.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { User } from 'src/user/entities/user.entity';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { AuthModule } from 'src/auth/auth.module';
import { PublicSettingsController } from './public-settings.controller';


@Module({
    imports: [
        TypeOrmModule.forFeature([PlatformSettings, AdminAuditLog, User, Wallet]),
        AuthModule,
    ],
    controllers: [AdminController, PublicSettingsController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule {}
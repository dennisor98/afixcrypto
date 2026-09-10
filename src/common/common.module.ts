import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSettings } from 'src/admin/entities/platform-settings.entity';
import { SettingsService } from './settings.service';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([PlatformSettings])],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class CommonModule {}
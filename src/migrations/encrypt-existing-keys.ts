import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { encrypt } from '../common/crypto.util';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
})
class MigrationModule {}

async function migrate() {
    const app = await NestFactory.createApplicationContext(MigrationModule);
    const configService = app.get(ConfigService);

    const dataSource = new DataSource({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') || '3306'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        entities: [],
    });

    await dataSource.initialize();

    const users = await dataSource.query(
        'SELECT id, privateKey FROM user WHERE privateKey IS NOT NULL'
    );

    console.log(`Found ${users.length} users with private keys`);

    let migrated = 0;
    for (const user of users) {
        if (user.privateKey.startsWith('enc:')) continue;

        const encrypted = encrypt(user.privateKey);
        await dataSource.query(
            'UPDATE user SET privateKey = ? WHERE id = ?',
            [encrypted, user.id]
        );
        migrated++;
    }

    console.log(`Encrypted ${migrated} private keys`);

    await dataSource.destroy();
    await app.close();
}

migrate().catch(console.error);
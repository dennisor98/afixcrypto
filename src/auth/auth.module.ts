import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { AdminGuard, AuthGuard, SuperAdminGuard } from './auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// AuthController and AuthService were removed: they were an unguarded
// scaffold that returned placeholder strings.
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [AuthGuard, AdminGuard, SuperAdminGuard],
  exports: [AuthGuard, AdminGuard, SuperAdminGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}

// app.module.ts

import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { VerificationController } from './mailer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mailer } from './entities/mailer.entity';

@Module({imports:[TypeOrmModule.forFeature([Mailer]),],
  controllers: [VerificationController],
  providers: [OtpService, EmailService],
  exports:[OtpService, EmailService]
})
export class MailModule {}

// verification.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateMailerDto } from './dto/create-mailer.dto';

@Controller('verification')
@ApiTags('email')
export class VerificationController {
  constructor(
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  @Throttle({ auth: { limit: 3, ttl: 60_000 * 5 } }) // max 3 OTP requests per 5 mins
  @Post('send-email')
  async sendOTP(@Body() createEmaildto: CreateMailerDto) {
    const otp = this.otpService.generateOTP(createEmaildto.email);

    await this.emailService.sendVerificationEmail(createEmaildto.email, otp);

    return { message: 'Email sent successfully' };
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 * 10 } }) // limit verification attempts
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; otp: string }) {
    const { email, otp } = body;

    // Must be awaited, and the OTP is the first argument.
    // Without await the result is a Promise and always truthy.
    const isValid = await this.otpService.validateOTP(otp, email);

    if (!isValid) {
      return { message: 'Invalid or expired OTP', success: false };
    }

    return { message: 'Email verified successfully', success: true };
  }
}
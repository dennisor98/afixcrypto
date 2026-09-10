import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as speakeasy from 'speakeasy';
import { Repository } from 'typeorm';
import { Mailer } from './entities/mailer.entity';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class OtpService {
  private resend: Resend;
  private fromEmail: string;
  private publicUrl: string;

  constructor(
      @InjectRepository(Mailer) private readonly mailerRepo: Repository<Mailer>,
      private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.fromEmail = this.configService.get<string>('MAILER_FROM') || 'onboarding@resend.dev';
    this.publicUrl = this.configService.get<string>('PUBLIC_URL') || 'http://localhost:3000';
  }

  generateOTP(email: string): string {
    const otp = speakeasy.totp({
      secret: email,
      encoding: 'base32',
      step: 300,
    });
    return otp;
  }

  async validateOTP(userOTP: string, email: string): Promise<boolean> {
    const mailer: Mailer | null = await this.mailerRepo.findOne({ where: { email } });
    if (!mailer) return false;
    if (userOTP !== mailer.otp) return false;

    const isValid = speakeasy.totp.verify({
      secret: email,
      encoding: 'base32',
      token: userOTP,
      step: 300,
      window: 1,
    });
    return isValid;
  }

  async sendOTPEmail(email: string, otp: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Your afixcrypto login code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0e11; color: white; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; padding: 12px 24px; background: #f0b90b; border-radius: 12px; font-weight: 900; font-size: 22px; color: black; letter-spacing: 0.5px;">afixcrypto</div>
              <h1 style="color: white; margin: 20px 0 4px; font-size: 22px;">Verify your login</h1>
              <p style="color: #848e9c; margin: 0; font-size: 14px;">Enter this code to complete sign-in</p>
            </div>
            <div style="background: #161a1f; border: 1px solid #1e2329; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f0b90b; margin: 0; font-family: monospace;">${otp}</p>
            </div>
            <p style="color: #848e9c; font-size: 13px; line-height: 1.6; text-align: center;">
              This code expires in 10 minutes. If you didn't try to log in, please change your password immediately.
            </p>
            <p style="color: #2b3139; font-size: 12px; text-align: center; margin-top: 24px;">
              afixcrypto · Trade BTC in 5-minute windows
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw error;
    }
  }
}
// email.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mailer } from './entities/mailer.entity';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly brandName: string;
  private readonly supportLink: string;
  private readonly fromAddress: string;

  constructor(
    @InjectRepository(Mailer) private readonly mailerRepo: Repository<Mailer>,
    private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.brandName = this.configService.get<string>('APP_NAME') ?? 'afixcrypto';
    this.supportLink = this.configService.get<string>('SUPPORT_LINK') ?? '';
    this.fromAddress =
      this.configService.get<string>('MAILER_FROM') ?? 'onboarding@resend.dev';
  }

  async sendVerificationEmail(to: string, token: string) {
    console.log('Sending verification email to:', to);

    // Save/update OTP in DB
    const existingMailer = await this.mailerRepo.findOne({
      where: { email: to },
    });
    if (existingMailer) {
      existingMailer.otp = token;
      await this.mailerRepo.save(existingMailer);
    } else {
      const mailer = new Mailer();
      mailer.otp = token;
      mailer.email = to;
      await this.mailerRepo.save(mailer);
    }

    // Send via Resend
    const { data, error } = await this.resend.emails.send({
      from: `${this.brandName} <${this.fromAddress}>`,
      to,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#0b0e11;font-family:Arial,sans-serif;">
            <div style="max-width:520px;margin:40px auto;background:#161a1f;border:1px solid #1e2329;border-radius:16px;overflow:hidden;">
              <div style="background:#f0b90b;padding:24px;text-align:center;">
                <h1 style="margin:0;color:#000;font-size:24px;font-weight:900;">&#8383; ${this.brandName}</h1>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#ffffff;font-size:20px;margin:0 0 12px;">Verify your email</h2>
                <p style="color:#848e9c;font-size:14px;line-height:1.6;margin:0 0 24px;">
                  Use the code below to complete your registration. This code expires in 10 minutes.
                </p>
                <div style="background:#0b0e11;border:1px solid #2b3139;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                  <span style="font-size:36px;font-weight:900;color:#f0b90b;letter-spacing:8px;">${token}</span>
                </div>
                <p style="color:#848e9c;font-size:13px;line-height:1.6;margin:0 0 8px;">
                  If you did not request this, you can safely ignore this email.
                </p>
                <p style="color:#848e9c;font-size:13px;line-height:1.6;margin:0;">
                  Need help? <a href="${this.supportLink}" style="color:#f0b90b;text-decoration:none;">Contact Support</a>
                </p>
              </div>
              <div style="border-top:1px solid #1e2329;padding:16px;text-align:center;">
                <p style="color:#2b3139;font-size:12px;margin:0;">
                  &copy; ${new Date().getFullYear()} ${this.brandName}. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Email sent successfully:', data?.id);
    return data;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getApplicationInfo() {
    return {
      name: this.configService.get<string>('APP_NAME'),
      version: this.configService.get<string>('APP_VERSION'),
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  getHealthStatus() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV'),
    };
  }

  getVersion() {
    return {
      version: this.configService.get<string>('APP_VERSION'),
      apiVersion: this.configService.get<string>('API_VERSION'),
    };
  }
}
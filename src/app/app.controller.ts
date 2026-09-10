import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return this.appService.getApplicationInfo();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealthStatus();
  }


  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }


  @Get('version')
  getVersion() {
    return this.appService.getVersion();
  }
  
}
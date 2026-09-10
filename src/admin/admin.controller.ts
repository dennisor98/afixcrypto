import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import {AdminGuard, SuperAdminGuard} from 'src/auth/auth.guard';
import { AdminService } from './admin.service';
import { SkipThrottle} from "@nestjs/throttler";

@Controller('admin')
@UseGuards(AdminGuard)
@SkipThrottle()
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    // Platform settings
    @Get('settings')
    getSettings() {
        return this.adminService.getSettings();
    }

    @Patch('settings')
    @UseGuards(SuperAdminGuard)
    updateSettings(@Body() body: any, @Request() req: any) {
        return this.adminService.updateSettings(body, req.user.id);
    }

    // User controls
    @Post('users/:userId/balance')
    adjustBalance(
        @Param('userId') userId: string,
        @Body() body: { amount: number; type: 'credit' | 'debit'; reason: string },
        @Request() req: any,
    ) {
        return this.adminService.adjustUserBalance(req.user.id, userId, body.amount, body.type, body.reason);
    }

    @Patch('users/:userId/role')
    @UseGuards(SuperAdminGuard)
    setRole(
        @Param('userId') userId: string,
        @Body() body: { role: string },
        @Request() req: any,
    ) {
        return this.adminService.setUserRole(req.user.id, userId, body.role);
    }

    @Post('users/:userId/reset-2fa')
    reset2FA(@Param('userId') userId: string, @Request() req: any) {
        return this.adminService.resetUser2FA(req.user.id, userId);
    }

    @Post('users/:userId/force-logout')
    forceLogout(@Param('userId') userId: string, @Request() req: any) {
        return this.adminService.forceLogoutUser(req.user.id, userId);
    }

    @Patch('users/:userId/verify-email')
    verifyEmail(
        @Param('userId') userId: string,
        @Body() body: { verified: boolean },
        @Request() req: any,
    ) {
        return this.adminService.verifyUserEmail(req.user.id, userId, body.verified);
    }

    @Patch('users/:userId/first-deposit')
    setFirstDeposit(
        @Param('userId') userId: string,
        @Body() body: { hasDeposit: boolean },
        @Request() req: any,
    ) {
        return this.adminService.setFirstDepositStatus(req.user.id, userId, body.hasDeposit);
    }

    // Audit log
    @Get('audit-log')
    getAuditLog(@Query('limit') limit?: string, @Query('offset') offset?: string) {
        return this.adminService.getAuditLog(
            limit ? parseInt(limit) : 100,
            offset ? parseInt(offset) : 0,
        );
    }

    @Get('admins')
    @UseGuards(SuperAdminGuard)
    getAllAdmins() {
        return this.adminService.getAllAdmins();
    }
}
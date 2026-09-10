import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards ,Request} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SignupDto } from './dto/sign-up.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AdminGuard, AuthGuard } from 'src/auth/auth.guard';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto'
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import express from 'express';
import {Res, Req} from '@nestjs/common';
import express_1 from 'express';

@Controller('user')
@ApiTags("user")
@ApiBearerAuth('defaultBearerAuth')

export class UserController {
  constructor(private readonly userService: UserService) {
  }


  @Throttle({auth: {limit: 3, ttl: 60_000 * 60}})  // 3 signups per hour per IP
  @Post('signUp')
  async signup(@Body() sighUpdto: SignupDto) {
    return await this.userService.signup(sighUpdto);
  }

  @Throttle({auth: {limit: 5, ttl: 60_000 * 15}})
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.userService.login(dto);
    // Returns { requiresOtp: true, email } — no cookies set yet
  }


  @Get("wallet")
  @UseGuards(AuthGuard)
  getWallet(@Request() req: any) {
    const user = req.user;
    console.log(user);
    return this.userService.getWallet(user)
  }

  // Admin endpoints
  @Get('admin/users')
  @UseGuards(AdminGuard)
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get('admin/users/:id')
  @UseGuards(AdminGuard)
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch('admin/users/:id')
  @UseGuards(AdminGuard)
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch('admin/users/:id/block')
  @UseGuards(AdminGuard)
  blockUser(@Param('id') id: string, @Body() body: { isblocked: boolean }) {
    return this.userService.blockUser(id, body.isblocked);
  }

  @Get('admin/stats')
  @UseGuards(AdminGuard)
  getAdminStats() {
    return this.userService.getAdminStats();
  }

  @Throttle({auth: {limit: 10, ttl: 60_000 * 15}})
  @Post('verify-login-otp')
  async verifyLoginOtp(
      @Body() dto: { email: string; password: string; otp: string },
      @Res({passthrough: true}) res: express.Response,
  ) {
    const result = await this.userService.verifyLoginOtp(dto);
    const {refreshToken, ...response} = result as any;
    if (refreshToken) {
      this.setRefreshCookie(res, refreshToken);
    }
    return response;  // refreshToken NOT exposed in JSON body
  }


  @Throttle({auth: {limit: 5, ttl: 60_000 * 60}})
  @UseGuards(AuthGuard)
  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    return this.userService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(AuthGuard)
  @Post('toggle-2fa')
  toggle2fa(@Body() body: { enabled: boolean }, @Request() req: any) {
    return this.userService.toggleTwoFactor(req.user.id, body.enabled);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    // Fields are listed explicitly. Returning req.user directly would leak
    // the password hash and the encrypted private key.
    const u = req.user;
    return {
      id: u.id,
      email: u.email,
      userName: u.userName,
      address: u.address,
      referralCode: u.referralCode,
      roles: u.roles,
      hasMadeFirstDeposit: u.hasMadeFirstDeposit,
      isEmailConfirmed: u.isEmailConfirmed,
      twoFactorEnabled: u.twoFactorEnabled,
      isblocked: u.isblocked,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    };
  }

  @UseGuards(AuthGuard)
  @Get('security')
  getSecurity(@Request() req: any) {
    return this.userService.getSecurityInfo(req.user.id);
  }

  @Throttle({auth: {limit: 3, ttl: 60_000 * 30}})
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.userService.requestPasswordReset(dto.email);
  }

  @Throttle({auth: {limit: 5, ttl: 60_000 * 30}})
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(dto);
  }

  @Post('refresh')
  async refresh(
      @Req() req: any,                                  // changed from Request to any
      @Res({passthrough: true}) res: express_1.Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    const result = await this.userService.refreshAccessToken(refreshToken);
    const {refreshToken: newRefresh, ...response} = result as any;
    if (newRefresh) {
      this.setRefreshCookie(res, newRefresh);
    }
    return response;
  }

  private setRefreshCookie(res: any, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/user/refresh',
    });
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.userService.revokeRefreshToken(req.user.id);
    res.clearCookie('refresh_token', { path: '/user/refresh' });
    return { message: 'Logged out' };
  }

}
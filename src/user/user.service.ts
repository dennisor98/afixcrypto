import {
  ConsoleLogger,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, DataSource } from 'typeorm';
import { SignupDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcrypt';
import { TronWalletService } from 'src/tronwallet/tronwallet.service';
import { OtpService } from 'src/mailer/otp.service';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Wallet } from './entities/user.wallet.entity';
import { ReferralsService } from 'src/referral/referral.service';
import { Bet } from 'src/bets/entities/bet.entity';
import { TronwalletDeposits } from 'src/tronwallet/entities/tronwallet.entity';
import { WithdrawalRequests } from 'src/tronwallet/entities/withdrawal.request.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { encrypt } from 'src/common/crypto.util';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class UserService {
  constructor(
      @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
      @InjectRepository(User) private readonly userRepo: Repository<User>,
      private readonly tronWalletService: TronWalletService,
      private readonly otpService: OtpService,
      private jwtService: JwtService,
      private readonly referralsService: ReferralsService,
      @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getWallet(userinput: any) {
    const user = await this.findById(userinput.id ?? userinput.sub);
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: user.id } },
    });
    return wallet;
  }

  async findById(id: string): Promise<User> {
    if (!id) {
      throw new UnauthorizedException('User does not exist');
    }
    const user = await this.userRepo.findOne({ where: { id: id } });
    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.findByEmail(dto.email);

    if (!user) throw new UnauthorizedException('Invalid Credentials');
    if (user.isblocked) {
      throw new UnauthorizedException('Account is blocked, please contact admin');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Always require email OTP on every login for maximum security
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.loginOtp = otp;
    user.loginOtpExpiry = expiry;
    await this.userRepo.save(user);

    await this.otpService.sendOTPEmail(user.email, otp);

    return {
      requiresOtp: true,
      email: user.email,
      message: 'A verification code has been sent to your email',
    };
  }

  async verifyLoginOtp(dto: { email: string; password: string; otp: string }) {
    const user = await this.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid Credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Invalid Credentials');

    if (!user.loginOtp || !user.loginOtpExpiry) {
      throw new UnauthorizedException('No pending OTP — please log in again');
    }
    if (new Date() > user.loginOtpExpiry) {
      throw new UnauthorizedException('OTP expired — please log in again');
    }
    if (user.loginOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP valid — clear it and issue token
    user.loginOtp = null;
    user.loginOtpExpiry = null;
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return this.issueAuthResponse(user);
  }

  // private async issueAuthResponse(user: User) {
  //   const payload = { sub: user.id, username: user.email };
  //   const accessToken = await this.jwtService.signAsync(payload);
  //
  //   user.lastLoginAt = new Date();
  //   await this.userRepo.save(user);
  //
  //   return {
  //     id: user.id,
  //     email: user.email,
  //     token: accessToken,
  //     referralCode: user.referralCode,
  //     userName: user.userName,
  //     address: user.address,
  //     roles: user.roles,
  //     twoFactorEnabled: user.twoFactorEnabled,
  //   };
  // }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(userId);
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      throw new HttpException('New password must be different from current', HttpStatus.BAD_REQUEST);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    await this.userRepo.save(user);

    return { message: 'Password changed successfully' };
  }

  async toggleTwoFactor(userId: string, enabled: boolean) {
    const user = await this.findById(userId);
    user.twoFactorEnabled = enabled;
    if (!enabled) {
      user.twoFactorSecret = null;
    }
    await this.userRepo.save(user);
    return { twoFactorEnabled: user.twoFactorEnabled };
  }

  async getSecurityInfo(userId: string) {
    const user = await this.findById(userId);
    return {
      twoFactorEnabled: user.twoFactorEnabled,
      isEmailConfirmed: user.isEmailConfirmed,
      passwordChangedAt: user.passwordChangedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async findByEmailbets(email: string): Promise<User | null> {
    if (!email) return null;
    return this.userRepo.findOne({
      where: { email: email },
      relations: ['bets'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return this.userRepo.findOne({ where: { email: email } });
  }

  async signup(dto: SignupDto) {
    const use = await this.findByEmail(dto.email);
    if (use) {
      throw new HttpException('Account exist, please login', HttpStatus.CONFLICT);
    }
    const isvalid = await this.otpService.validateOTP(dto.emailCode, dto.email);
    if (isvalid == false) {
      throw new HttpException('Invalid code', HttpStatus.FORBIDDEN);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);
    return await this.create({
      userName: dto.userName,
      email: dto.email,
      password: hash,
      emailCode: dto.emailCode,
      referralCode: dto.referralCode,
    });
  }

  async create(dto: CreateUserDto): Promise<any> {
    console.log(dto);
    const tronwallet = await this.tronWalletService.createTronAccount();
    const { privateKey, publicKey, address } = tronwallet;
    if (!privateKey || !publicKey || !address?.base58) {
      throw new HttpException(
          'Unable to provision Tron wallet',
          HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const newReferralCode = await this.generateShortReferralCode(6);
    const userr = new User();
    userr.userName = dto.userName;
    userr.email = dto.email;
    userr.password = dto.password;
    userr.referralCode = newReferralCode;
    userr.privateKey = encrypt(privateKey);
    userr.publicKey = publicKey;
    userr.address = address.base58;
    try {
      var user = await this.userRepo.save(userr);

      const wallet = new Wallet();
      wallet.amount = '2';
      wallet.flows = '0';
      wallet.virtualamount = '0';
      wallet.user = user;
      await this.walletRepo.save(wallet);
      await this.referralsService.createReferralForNewUser(
          user,
          dto.referralCode || '',
      );

      const payload = { sub: user.id, username: user.email };
      const accessToken = await this.jwtService.signAsync(payload);

      const responseUser = {
        id: user.id,
        email: user.email,
        token: accessToken,
        referralCode: user.referralCode,
        userName: user.userName,
        address: user.address,
        roles: user.roles,
      };
      return responseUser;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ForbiddenException('Credentials taken');
      }
    }
  }

  generateShortReferralCode(length: number): string {
    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters.charAt(randomIndex);
    }
    return code;
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['wallet', 'bets'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['wallet', 'bets', 'deposits', 'withdrawalsRequest'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateData);
    return this.userRepo.save(user);
  }

  async blockUser(id: string, isblocked: boolean): Promise<User> {
    const user = await this.findById(id);
    user.isblocked = isblocked;
    return this.userRepo.save(user);
  }

  async getAdminStats(): Promise<any> {
    const betRepo = this.dataSource.getRepository(Bet);
    const depositRepo = this.dataSource.getRepository(TronwalletDeposits);
    const withdrawalRepo = this.dataSource.getRepository(WithdrawalRequests);

    const [allUsers, allBets, allDeposits, allWithdrawals] = await Promise.all([
      this.userRepo.find(),
      betRepo.find(),
      depositRepo.find(),
      withdrawalRepo.find(),
    ]);

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => !u.isblocked).length;
    const totalBets = allBets.length;
    const activeBets = allBets.filter((b: any) => b.status === 'pending').length;
    const totalDeposits = allDeposits.length;
    const totalWithdrawals = allWithdrawals.length;
    const totalRevenue = allDeposits.reduce(
        (sum: number, d: any) => sum + (d.amount || 0),
        0,
    );
    const pendingWithdrawals = allWithdrawals.filter(
        (w: any) => w.status === 'pending',
    ).length;

    return {
      totalUsers,
      activeUsers,
      totalBets,
      activeBets,
      totalDeposits,
      totalWithdrawals,
      totalRevenue,
      pendingWithdrawals,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.findByEmail(email);
    // Always return success message to prevent email enumeration attacks
    if (!user) {
      return { message: 'If an account exists, a reset code has been sent' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    user.loginOtp = otp;
    user.loginOtpExpiry = expiry;
    await this.userRepo.save(user);

    await this.otpService.sendOTPEmail(user.email, otp);
    return { message: 'If an account exists, a reset code has been sent' };
  }

  async resetPassword(dto: { email: string; otp: string; newPassword: string }) {
    const user = await this.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid request');
    if (!user.loginOtp || !user.loginOtpExpiry) {
      throw new UnauthorizedException('No active reset request');
    }
    if (new Date() > user.loginOtpExpiry) {
      throw new UnauthorizedException('Reset code expired — please request a new one');
    }
    if (user.loginOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid reset code');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(dto.newPassword, salt);
    user.passwordChangedAt = new Date();
    user.loginOtp = null;
    user.loginOtpExpiry = null;
    await this.userRepo.save(user);

    return { message: 'Password reset successfully. Please log in.' };
  }


  private async issueAuthResponse(user: User) {
    const accessToken = await this.jwtService.signAsync(
        { sub: user.id, username: user.email },
        { expiresIn: '15m' },
    );

    // Generate refresh token (cryptographically random, 32 bytes)
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    user.refreshTokenHash = refreshTokenHash;
    user.refreshTokenExpiry = refreshExpiry;
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return {
      id: user.id,
      email: user.email,
      token: accessToken,
      refreshToken,                  // sent once, frontend puts in httpOnly cookie via response
      referralCode: user.referralCode,
      userName: user.userName,
      address: user.address,
      roles: user.roles,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const user = await this.userRepo.findOne({ where: { refreshTokenHash: hash } });

    if (!user) throw new UnauthorizedException('Invalid refresh token');
    if (!user.refreshTokenExpiry || new Date() > user.refreshTokenExpiry) {
      user.refreshTokenHash = null;
      user.refreshTokenExpiry = null;
      await this.userRepo.save(user);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: invalidate old refresh, issue new pair
    return this.issueAuthResponse(user);
  }

  async revokeRefreshToken(userId: string) {
    const user = await this.findById(userId);
    user.refreshTokenHash = null;
    user.refreshTokenExpiry = null;
    await this.userRepo.save(user);
    return { message: 'Logged out successfully' };
  }
}
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

async function refreshExpiredToken(
  request: Request,
  jwtService: JwtService,
  userRepo: Repository<User>,
  configService: ConfigService,
): Promise<{ accessToken: string; user: User }> {
  const refreshToken = (request as any).cookies?.refresh_token;
  if (!refreshToken) throw new UnauthorizedException();

  const hash = createHash('sha256').update(refreshToken).digest('hex');
  const user = await userRepo.findOne({ where: { refreshTokenHash: hash } });
  if (!user || !user.refreshTokenExpiry || new Date() > user.refreshTokenExpiry) {
    throw new UnauthorizedException();
  }

  const accessToken = await jwtService.signAsync(
    { sub: user.id, username: user.email },
    { secret: configService.get<string>('JWT_SECRET'), expiresIn: '15m' },
  );
  const newRefreshToken = randomBytes(32).toString('hex');
  user.refreshTokenHash = createHash('sha256')
    .update(newRefreshToken)
    .digest('hex');
  user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await userRepo.save(user);

  const response = (request as any).res;
  response?.setHeader('X-Access-Token', accessToken);
  response?.cookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  request.headers.authorization = `Bearer ${accessToken}`;

  return { accessToken, user };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
      private jwtService: JwtService,
      @InjectRepository(User) private readonly userRepo: Repository<User>,
      private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      request['user'] = payload;

      const synceduser = await this.userRepo.findOne({ where: { id: payload.sub } });
      request['user'] = synceduser;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        const refreshed = await refreshExpiredToken(
          request,
          this.jwtService,
          this.userRepo,
          this.configService,
        );
        (request as any)['user'] = refreshed.user;
        return true;
      }
      console.log('JWT verification failed:', error.message);
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
      private jwtService: JwtService,
      @InjectRepository(User) private readonly userRepo: Repository<User>,
      private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();

      // Allow both admin and super_admin
      const isAdminOrAbove = user.roles === 'admin' || user.roles === 'super_admin';
      if (!isAdminOrAbove) {
        throw new UnauthorizedException('Admin access required');
      }

      request['user'] = user;
      return true;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        const refreshed = await refreshExpiredToken(
          request,
          this.jwtService,
          this.userRepo,
          this.configService,
        );
        const isAdminOrAbove =
          refreshed.user.roles === 'admin' || refreshed.user.roles === 'super_admin';
        if (!isAdminOrAbove) throw new UnauthorizedException('Admin access required');
        (request as any)['user'] = refreshed.user;
        return true;
      }
      console.log('JWT verification failed:', error.message);
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
      private readonly jwtService: JwtService,
      private readonly configService: ConfigService,
      @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');
      if (user.roles !== 'super_admin') {
        throw new UnauthorizedException('Super admin access required');
      }
      (request as any)['user'] = user;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        const refreshed = await refreshExpiredToken(
          request,
          this.jwtService,
          this.userRepo,
          this.configService,
        );
        if (refreshed.user.roles !== 'super_admin') {
          throw new UnauthorizedException('Super admin access required');
        }
        (request as any)['user'] = refreshed.user;
        return true;
      }
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
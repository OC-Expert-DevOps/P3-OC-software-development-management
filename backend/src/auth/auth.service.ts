import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Register a new user account.
   * Returns an access token (user is immediately logged in).
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
      },
    });

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  /**
   * Authenticate a user with email + password.
   * Returns access token + refresh token.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  /**
   * Revoke a refresh token (logout).
   */
  async logout(refreshToken: string): Promise<void> {
    // Find and revoke the token
    const tokens = await this.prisma.refreshToken.findMany({
      where: { isRevoked: false },
    });

    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        await this.prisma.refreshToken.update({
          where: { id: t.id },
          data: { isRevoked: true },
        });
        return;
      }
    }
  }

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refresh(refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { isRevoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        // Revoke old token (rotation)
        await this.prisma.refreshToken.update({
          where: { id: t.id },
          data: { isRevoked: true },
        });

        // Issue new tokens
        const accessToken = this.generateAccessToken(t.user.id, t.user.email);
        const newRefreshToken = await this.createRefreshToken(t.user.id);

        return {
          accessToken,
          refreshToken: newRefreshToken,
          user: { id: t.user.id, email: t.user.email },
        };
      }
    }

    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  // ─── Private helpers ───

  private generateAccessToken(userId: string, email: string): string {
    const secret = this.config.get<string>('JWT_SECRET');
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '15m';

    return jwt.sign({ sub: userId, email }, secret, { expiresIn });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = randomUUID();
    const tokenHash = await bcrypt.hash(raw, SALT_ROUNDS);
    const ttl = this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d';
    const days = parseInt(ttl) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return raw;
  }
}

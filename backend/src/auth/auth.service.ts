import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
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
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) return;

    const token = await this.prisma.refreshToken.findUnique({
      where: { selector: parsed.selector },
    });
    if (!token || token.isRevoked) return;

    const match = await bcrypt.compare(parsed.verifier, token.tokenHash);
    if (!match) return;

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { isRevoked: true },
    });
  }

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refresh(refreshToken: string) {
    const invalid = () => new UnauthorizedException('Invalid or expired refresh token');

    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) throw invalid();

    const token = await this.prisma.refreshToken.findUnique({
      where: { selector: parsed.selector },
      include: { user: true },
    });
    if (!token || token.isRevoked || token.expiresAt <= new Date()) {
      throw invalid();
    }

    const match = await bcrypt.compare(parsed.verifier, token.tokenHash);
    if (!match) throw invalid();

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { isRevoked: true },
    });

    // Issue new tokens
    const accessToken = this.generateAccessToken(token.user.id, token.user.email);
    const newRefreshToken = await this.createRefreshToken(token.user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: { id: token.user.id, email: token.user.email },
    };
  }

  // ─── Private helpers ───

  private generateAccessToken(userId: string, email: string): string {
    const secret = this.config.get<string>('JWT_SECRET')!;
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '15m';

    return jwt.sign({ sub: userId, email }, secret, { expiresIn });
  }

  /**
   * Refresh tokens are `${selector}.${verifier}`. The selector is stored in
   * plaintext with a unique index, so logout()/refresh() can look up the
   * matching row directly instead of scanning every active token and running
   * bcrypt.compare() against each one. Only the verifier is secret — it's
   * never stored, only its bcrypt hash (tokenHash) is.
   */
  private parseRefreshToken(raw: string): { selector: string; verifier: string } | null {
    const [selector, verifier] = raw.split('.', 2);
    if (!selector || !verifier) return null;
    return { selector, verifier };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const selector = randomBytes(16).toString('hex');
    const verifier = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(verifier, SALT_ROUNDS);
    const ttl = this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d';
    const days = parseInt(ttl) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, selector, tokenHash, expiresAt },
    });

    return `${selector}.${verifier}`;
  }
}

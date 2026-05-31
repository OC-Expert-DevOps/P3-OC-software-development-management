import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock factories ───

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret-key-that-is-long-enough-32chars!',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_EXPIRES_IN: '7d',
    };
    return map[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── REGISTER ───

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'MyP@ssw0rd' };

    it('should create a user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'user-uuid-1',
        email: data.email,
        passwordHash: data.passwordHash,
      }));
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.register(dto);

      const call = mockPrisma.user.create.mock.calls[0][0];
      expect(call.data.passwordHash).not.toBe(dto.password);
      const isValid = await bcrypt.compare(dto.password, call.data.passwordHash);
      expect(isValid).toBe(true);
    });
  });

  // ─── LOGIN ───

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'MyP@ssw0rd' };

    it('should return tokens for valid credentials', async () => {
      const hash = await bcrypt.hash('MyP@ssw0rd', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        passwordHash: hash,
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe('user-uuid-1');
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('DifferentPassword', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── LOGOUT ───

  describe('logout', () => {
    it('should revoke matching refresh token', async () => {
      const raw = 'some-refresh-token';
      const hash = await bcrypt.hash(raw, 10);
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        { id: 'rt-1', tokenHash: hash, isRevoked: false },
      ]);
      mockPrisma.refreshToken.update.mockResolvedValue({});

      await service.logout(raw);

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should do nothing if token not found', async () => {
      mockPrisma.refreshToken.findMany.mockResolvedValue([]);

      await service.logout('unknown-token');

      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  // ─── REFRESH ───

  describe('refresh', () => {
    it('should issue new tokens for valid refresh token', async () => {
      const raw = 'valid-refresh-token';
      const hash = await bcrypt.hash(raw, 10);
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        {
          id: 'rt-1',
          tokenHash: hash,
          isRevoked: false,
          expiresAt: new Date(Date.now() + 86400000),
          user: { id: 'user-uuid-1', email: 'test@example.com' },
        },
      ]);
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(raw);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // Old token should be revoked
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrisma.refreshToken.findMany.mockResolvedValue([]);

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

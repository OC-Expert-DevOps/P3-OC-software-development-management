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
    findUnique: jest.fn(),
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
      const selector = 'selector123';
      const verifier = 'verifier-secret';
      const hash = await bcrypt.hash(verifier, 10);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', selector, tokenHash: hash, isRevoked: false });
      mockPrisma.refreshToken.update.mockResolvedValue({});

      await service.logout(`${selector}.${verifier}`);

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({ where: { selector } });
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should do nothing if the token is malformed (no selector.verifier split)', async () => {
      await service.logout('not-a-valid-token');

      expect(mockPrisma.refreshToken.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should do nothing if the selector is not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await service.logout('unknown-selector.unknown-verifier');

      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should do nothing if the verifier does not match the stored hash', async () => {
      const hash = await bcrypt.hash('correct-verifier', 10);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', selector: 'sel', tokenHash: hash, isRevoked: false });

      await service.logout('sel.wrong-verifier');

      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  // ─── REFRESH ───

  describe('refresh', () => {
    const validToken = () => ({
      id: 'rt-1',
      selector: 'sel-1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      user: { id: 'user-uuid-1', email: 'test@example.com' },
    });

    it('should issue new tokens for valid refresh token, looked up by selector', async () => {
      const verifier = 'valid-verifier';
      const hash = await bcrypt.hash(verifier, 10);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ ...validToken(), tokenHash: hash });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(`sel-1.${verifier}`);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { selector: 'sel-1' },
        include: { user: true },
      });
      // Old token should be revoked
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException for a malformed token', async () => {
      await expect(service.refresh('not-a-valid-format')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the selector is not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('sel.verifier')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the token is revoked', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ ...validToken(), tokenHash: 'x', isRevoked: true });

      await expect(service.refresh('sel-1.verifier')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the token has expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...validToken(),
        tokenHash: 'x',
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('sel-1.verifier')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the verifier does not match', async () => {
      const hash = await bcrypt.hash('correct-verifier', 10);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ ...validToken(), tokenHash: hash });

      await expect(service.refresh('sel-1.wrong-verifier')).rejects.toThrow(UnauthorizedException);
    });
  });
});

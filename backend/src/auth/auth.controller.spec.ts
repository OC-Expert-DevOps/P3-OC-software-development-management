import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
};

const mockConfig = { get: jest.fn(() => 'test-secret-32-chars-long!!!!!!') };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  const mockRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  };

  describe('register', () => {
    it('should register and return 201 with tokens', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      mockAuthService.register.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-uuid',
        user: { id: 'u1', email: 'test@test.com' },
      });
      const res = mockRes();

      await controller.register(dto, res);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token', 'refresh-uuid',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'access-jwt' }),
      );
    });
  });

  describe('login', () => {
    it('should login and return 200 with tokens', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'ref',
        user: { id: 'u1', email: 'test@test.com' },
      });
      const res = mockRes();

      await controller.login(dto, res);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  describe('logout', () => {
    it('should clear cookie and call service logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = { cookies: { refresh_token: 'old-token' } } as any;
      const res = mockRes();

      await controller.logout(req, res);

      expect(mockAuthService.logout).toHaveBeenCalledWith('old-token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(res.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh tokens from cookie', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access', refreshToken: 'new-refresh',
        user: { id: 'u1' },
      });
      const req = { cookies: { refresh_token: 'old-refresh' } } as any;
      const res = mockRes();

      await controller.refresh(req, res);

      expect(mockAuthService.refresh).toHaveBeenCalledWith('old-refresh');
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });
});

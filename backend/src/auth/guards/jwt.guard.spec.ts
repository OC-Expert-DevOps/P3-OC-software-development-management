import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtGuard } from './jwt.guard';

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

import * as jwt from 'jsonwebtoken';

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret-key-32-chars-long!!!';
    return undefined;
  }),
};

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(() => {
    guard = new JwtGuard(mockConfig as unknown as ConfigService);
    jest.clearAllMocks();
  });

  const createContext = (authHeader?: string) => {
    const req = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: undefined as any,
    };
    return {
      req,
      ctx: {
        switchToHttp: () => ({ getRequest: () => req }),
      },
    };
  };

  it('should allow request with valid Bearer token', () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user-1', email: 'a@b.com' });
    const { ctx } = createContext('Bearer valid-token');

    expect(guard.canActivate(ctx as any)).toBe(true);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key-32-chars-long!!!');
  });

  it('should set request.user with userId and email', () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user-1', email: 'test@test.com' });
    const { ctx, req } = createContext('Bearer valid-token');

    guard.canActivate(ctx as any);

    expect(req.user).toEqual({ userId: 'user-1', email: 'test@test.com' });
  });

  it('should throw UnauthorizedException when no Authorization header', () => {
    const { ctx } = createContext();
    expect(() => guard.canActivate(ctx as any)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header is not Bearer', () => {
    const { ctx } = createContext('Basic abc123');
    expect(() => guard.canActivate(ctx as any)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token is invalid', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('bad'); });
    const { ctx } = createContext('Bearer bad-token');
    expect(() => guard.canActivate(ctx as any)).toThrow(UnauthorizedException);
  });
});

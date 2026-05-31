import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

/**
 * Guard that validates JWT access tokens from the Authorization header.
 * Attaches decoded payload to request.user.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = this.config.get<string>('JWT_SECRET');
      const payload = jwt.verify(token, secret);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

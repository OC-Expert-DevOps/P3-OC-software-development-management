import { IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Display name (optional, not stored yet)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'user@example.com', description: 'Valid email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyP@ssw0rd', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+{};:,<.>?])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter and one special character',
  })
  password: string;
}

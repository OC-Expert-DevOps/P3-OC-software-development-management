import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Valid email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyP@ssw0rd', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;
}

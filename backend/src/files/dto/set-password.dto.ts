import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPasswordDto {
  // Aligned with RegisterDto's account-password policy — a shared-link
  // password protects the same data as an account password would.
  @ApiProperty({ example: 'MyP@ssw0rd', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+{};:,<.>?])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter and one special character',
  })
  password!: string;
}

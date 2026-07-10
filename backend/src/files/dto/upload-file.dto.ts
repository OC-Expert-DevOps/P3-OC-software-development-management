import { IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadFileDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(30)
  expiryDays?: number;

  // Same policy as SetPasswordDto — a password set at upload time must meet
  // the same bar as one set afterwards via PUT /files/:id/password.
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+{};:,<.>?])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter and one special character',
  })
  password?: string;
}

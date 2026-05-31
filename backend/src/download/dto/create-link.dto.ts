import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateLinkDto {
  /** Time-to-live in seconds (default: DOWNLOAD_LINK_TTL_SECONDS env, fallback 86400). */
  @IsOptional()
  @IsInt()
  @Min(60)
  ttlSeconds?: number;

  /** Max number of downloads. 0 or undefined = unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDownloads?: number;
}

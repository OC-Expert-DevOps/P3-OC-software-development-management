import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

/**
 * Scheduled cleanup service that purges expired data from both
 * PostgreSQL and MinIO storage.
 *
 * Runs every hour by default (configurable via CLEANUP_CRON_EXPRESSION env var).
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Main cleanup cron — runs every hour.
   * 1. Purge expired files (soft-delete + remove from MinIO)
   * 2. Delete expired download tokens
   * 3. Delete expired/revoked refresh tokens
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    this.logger.log('Starting scheduled cleanup…');

    const [filesCount, tokensCount, refreshCount] = await Promise.all([
      this.purgeExpiredFiles(),
      this.purgeExpiredDownloadTokens(),
      this.purgeExpiredRefreshTokens(),
    ]);

    this.logger.log(
      `Cleanup complete — files: ${filesCount}, download tokens: ${tokensCount}, refresh tokens: ${refreshCount}`,
    );
  }

  /**
   * Find files where expiresAt < now AND isDeleted = false,
   * delete from MinIO, then soft-delete in DB.
   */
  async purgeExpiredFiles(): Promise<number> {
    const now = new Date();
    const expiredFiles = await this.prisma.file.findMany({
      where: { expiresAt: { lt: now }, isDeleted: false },
      select: { id: true, storageKey: true, originalName: true },
    });

    if (expiredFiles.length === 0) return 0;

    let purgedCount = 0;

    for (const file of expiredFiles) {
      try {
        // Remove from object storage
        await this.minioService.deleteFile(file.storageKey);

        // Soft-delete in DB + invalidate associated download tokens
        await this.prisma.$transaction([
          this.prisma.file.update({
            where: { id: file.id },
            data: { isDeleted: true },
          }),
          this.prisma.downloadToken.updateMany({
            where: { fileId: file.id, expiresAt: { gt: now } },
            data: { expiresAt: now },
          }),
        ]);

        purgedCount++;
        this.logger.log(`Purged expired file: ${file.originalName} (${file.id})`);
      } catch (err) {
        this.logger.error(
          `Failed to purge file ${file.id} (${file.originalName})`,
          (err as Error).stack,
        );
      }
    }

    return purgedCount;
  }

  /**
   * Hard-delete download tokens that expired more than 24 hours ago.
   * Keeps recently-expired tokens for audit/debugging purposes.
   */
  async purgeExpiredDownloadTokens(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.downloadToken.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });

    return result.count;
  }

  /**
   * Hard-delete refresh tokens that are revoked OR expired more than 24 hours ago.
   */
  async purgeExpiredRefreshTokens(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { isRevoked: true, createdAt: { lt: cutoff } },
        ],
      },
    });

    return result.count;
  }
}

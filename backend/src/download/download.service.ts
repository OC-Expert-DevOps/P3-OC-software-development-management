import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);
  private readonly defaultTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly config: ConfigService,
  ) {
    this.defaultTtl = this.config.get<number>('DOWNLOAD_LINK_TTL_SECONDS', 86400);
  }

  /** Generate a temporary download token for a file. */
  async createLink(fileId: string, userId: string, dto: CreateLinkDto) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) throw new NotFoundException('File not found');
    if (file.userId !== userId) throw new ForbiddenException('Access denied');

    const ttl = dto.ttlSeconds ?? this.defaultTtl;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const token = await this.prisma.downloadToken.create({
      data: {
        fileId,
        token: randomUUID(),
        expiresAt,
        maxDownloads: dto.maxDownloads ?? 0,
      },
    });

    this.logger.log(`Download link created for file=${fileId}, token=${token.id}`);
    return token;
  }

  /** List active (non-expired) download tokens for a file. */
  async findByFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) throw new NotFoundException('File not found');
    if (file.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.downloadToken.findMany({
      where: { fileId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Revoke a specific download token. */
  async revokeLink(fileId: string, tokenId: string, userId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) throw new NotFoundException('File not found');
    if (file.userId !== userId) throw new ForbiddenException('Access denied');

    const token = await this.prisma.downloadToken.findUnique({ where: { id: tokenId } });
    if (!token || token.fileId !== fileId) throw new NotFoundException('Token not found');

    await this.prisma.downloadToken.update({
      where: { id: tokenId },
      data: { expiresAt: new Date() },
    });

    this.logger.log(`Download link revoked: token=${tokenId}`);
  }

  /**
   * Validate a public download token and return a presigned MinIO URL.
   * Returns the redirect URL on success.
   */
  async useToken(tokenValue: string): Promise<string> {
    const token = await this.prisma.downloadToken.findUnique({
      where: { token: tokenValue },
      include: { file: true },
    });

    if (!token) throw new NotFoundException('Download link not found');

    if (token.expiresAt <= new Date()) {
      throw new GoneException('Download link has expired');
    }

    if (token.file.isDeleted) {
      throw new NotFoundException('File no longer available');
    }

    // Check max downloads
    if (token.maxDownloads > 0 && token.downloadCount >= token.maxDownloads) {
      throw new GoneException('Download limit reached');
    }

    // Increment download count
    await this.prisma.downloadToken.update({
      where: { id: token.id },
      data: { downloadCount: { increment: 1 } },
    });

    // Generate presigned URL (5 min TTL)
    const presignedUrl = await this.minioService.getPresignedUrl(token.file.storageKey, 300);

    this.logger.log(`Download used: token=${token.id}, file=${token.fileId}, count=${token.downloadCount + 1}`);
    return presignedUrl;
  }
}

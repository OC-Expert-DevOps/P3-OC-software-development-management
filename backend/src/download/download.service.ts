import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  GoneException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);
  private readonly defaultTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly config: ConfigService,
  ) {
    this.defaultTtl = this.config.get<number>('DOWNLOAD_LINK_TTL_SECONDS', 604800);
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

  /** Return file info for a download token (public, no auth required). */
  async getTokenInfo(tokenValue: string) {
    const token = await this.prisma.downloadToken.findUnique({
      where: { token: tokenValue },
      include: { file: true },
    });

    if (!token) throw new NotFoundException('Download link not found');
    if (token.expiresAt <= new Date()) throw new GoneException('Download link has expired');
    if (token.file.isDeleted) throw new NotFoundException('File no longer available');

    return {
      originalName: token.file.originalName,
      mimeType: token.file.mimeType,
      sizeBytes: token.file.sizeBytes.toString(),
      hasPassword: !!token.file.passwordHash,
    };
  }

  /**
   * Validate a public download token, check password if required,
   * and return the file stream from MinIO.
   */
  async streamFile(tokenValue: string, password?: string) {
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

    // Check password if file is password-protected
    if (token.file.passwordHash) {
      if (!password) {
        throw new UnauthorizedException('Password required');
      }
      const valid = await bcrypt.compare(password, token.file.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    // Increment download count
    await this.prisma.downloadToken.update({
      where: { id: token.id },
      data: { downloadCount: { increment: 1 } },
    });

    // Stream file from MinIO
    const fileData = await this.minioService.getFileStream(token.file.storageKey);

    this.logger.log(`Download used: token=${token.id}, file=${token.fileId}, count=${token.downloadCount + 1}`);
    return {
      stream: fileData.stream,
      contentType: fileData.contentType || token.file.mimeType || 'application/octet-stream',
      contentLength: fileData.contentLength,
      originalName: token.file.originalName,
    };
  }

  /**
   * @deprecated Use streamFile() instead. Kept for backward compat.
   */
  async useToken(tokenValue: string): Promise<string> {
    const token = await this.prisma.downloadToken.findUnique({
      where: { token: tokenValue },
      include: { file: true },
    });

    if (!token) throw new NotFoundException('Download link not found');
    if (token.expiresAt <= new Date()) throw new GoneException('Download link has expired');
    if (token.file.isDeleted) throw new NotFoundException('File no longer available');
    if (token.maxDownloads > 0 && token.downloadCount >= token.maxDownloads) {
      throw new GoneException('Download limit reached');
    }

    await this.prisma.downloadToken.update({
      where: { id: token.id },
      data: { downloadCount: { increment: 1 } },
    });

    const presignedUrl = await this.minioService.getPresignedUrl(token.file.storageKey, 300);
    this.logger.log(`Download used: token=${token.id}, file=${token.fileId}, count=${token.downloadCount + 1}`);
    return presignedUrl;
  }
}

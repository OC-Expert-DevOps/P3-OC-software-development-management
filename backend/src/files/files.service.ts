import 'multer'; // Required for Express.Multer.File type
import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize: number;
  private readonly forbiddenExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly config: ConfigService,
  ) {
    this.maxFileSize = this.config.get<number>('MAX_FILE_SIZE_BYTES', 1073741824);
  }

  async uploadFile(userId: string, file: Express.Multer.File, dto?: UploadFileDto) {
    try {
      if (!file) throw new BadRequestException('No file provided');

      if (file.size > this.maxFileSize) {
        throw new BadRequestException('File size exceeds maximum allowed');
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (this.forbiddenExts.includes(ext)) {
        throw new BadRequestException('File extension is forbidden');
      }

      const key = `${userId}/${randomUUID()}-${file.originalname}`;

      await this.minioService.uploadFile(key, file.buffer, file.mimetype);

      const expiryDays = dto?.expiryDays ?? this.config.get<number>('FILE_EXPIRY_DAYS_DEFAULT', 7);
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      const created = await this.prisma.file.create({
        data: {
          userId,
          originalName: file.originalname,
          storageKey: key,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          expiresAt,
        },
      });

      return created;
    } catch (err) {
      this.logger.error('uploadFile failed', err as any);
      throw err;
    }
  }

  async findAllByUser(userId: string, dto?: ListFilesDto) {
    try {
      const page = dto?.page ?? 1;
      const limit = dto?.limit ?? 20;
      const sortBy = dto?.sortBy ?? 'createdAt';
      const order = dto?.order ?? 'desc';
      const skip = (page - 1) * limit;

      const where = { userId, isDeleted: false };

      const [data, total] = await Promise.all([
        this.prisma.file.findMany({
          where,
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
        }),
        this.prisma.file.count({ where }),
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      this.logger.error('findAllByUser failed', err as any);
      throw err;
    }
  }

  /** Return file statistics for a user. */
  async getStats(userId: string) {
    try {
      const where = { userId, isDeleted: false };

      const [fileCount, deletedCount, aggregation, activeLinks] = await Promise.all([
        this.prisma.file.count({ where }),
        this.prisma.file.count({ where: { userId, isDeleted: true } }),
        this.prisma.file.aggregate({ where, _sum: { sizeBytes: true } }),
        this.prisma.downloadToken.count({
          where: {
            file: { userId, isDeleted: false },
            expiresAt: { gt: new Date() },
          },
        }),
      ]);

      return {
        fileCount,
        deletedCount,
        totalSizeBytes: (aggregation._sum.sizeBytes ?? BigInt(0)).toString(),
        activeLinks,
      };
    } catch (err) {
      this.logger.error('getStats failed', err as any);
      throw err;
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const file = await this.prisma.file.findUnique({ where: { id } });
      if (!file) throw new NotFoundException('File not found');
      if (file.userId !== userId) throw new ForbiddenException('Access denied');
      if (file.isDeleted) throw new NotFoundException('File not found');
      return file;
    } catch (err) {
      this.logger.error('findOne failed', err as any);
      throw err;
    }
  }

  async remove(id: string, userId: string) {
    try {
      const file = await this.findOne(id, userId);

      await this.minioService.deleteFile(file.storageKey);

      await this.prisma.file.update({ where: { id }, data: { isDeleted: true } });

      // Invalidate download tokens associated with this file
      await this.prisma.downloadToken.updateMany({ where: { fileId: id }, data: { expiresAt: new Date() } });
    } catch (err) {
      this.logger.error('remove failed', err as any);
      throw err;
    }
  }

  // ─── US07: Password-protected files ─────────────────────────────

  /** Set or update a password on a file (bcrypt hash stored). */
  async setPassword(id: string, userId: string, password: string) {
    const file = await this.findOne(id, userId);
    const hash = await bcrypt.hash(password, 10);
    return this.prisma.file.update({
      where: { id: file.id },
      data: { passwordHash: hash },
    });
  }

  /** Remove password protection from a file. */
  async removePassword(id: string, userId: string) {
    const file = await this.findOne(id, userId);
    return this.prisma.file.update({
      where: { id: file.id },
      data: { passwordHash: null },
    });
  }

  /** Verify password for a file (used by download flow). */
  async verifyPassword(fileId: string, password: string): Promise<boolean> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) throw new NotFoundException('File not found');
    if (!file.passwordHash) return true; // No password set
    return bcrypt.compare(password, file.passwordHash);
  }

  // ─── US08: Anonymous upload ─────────────────────────────────────

  /** Upload a file without authentication (userId = null). */
  async anonymousUpload(file: Express.Multer.File, dto?: UploadFileDto) {
    if (!file) throw new BadRequestException('No file provided');

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds maximum allowed');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (this.forbiddenExts.includes(ext)) {
      throw new BadRequestException('File extension is forbidden');
    }

    const key = `anonymous/${randomUUID()}-${file.originalname}`;

    await this.minioService.uploadFile(key, file.buffer, file.mimetype);

    const expiryDays = dto?.expiryDays ?? 1; // Anonymous files expire faster
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    return this.prisma.file.create({
      data: {
        userId: null,
        originalName: file.originalname,
        storageKey: key,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        expiresAt,
      },
    });
  }

  // ─── US09: File tagging ─────────────────────────────────────────

  /** Set tags on a file (upserts tags, replaces file-tag associations). */
  async setTags(id: string, userId: string, tagNames: string[]) {
    const file = await this.findOne(id, userId);

    // Upsert all tags
    const tagRecords = await Promise.all(
      tagNames.map(async (name) => {
        const normalized = name.trim().toLowerCase();
        return this.prisma.tag.upsert({
          where: { name: normalized },
          create: { name: normalized },
          update: {},
        });
      }),
    );

    // Replace all file-tag associations
    await this.prisma.fileTag.deleteMany({ where: { fileId: file.id } });
    await this.prisma.fileTag.createMany({
      data: tagRecords.map((tag) => ({ fileId: file.id, tagId: tag.id })),
    });

    return this.prisma.file.findUnique({
      where: { id: file.id },
      include: { fileTags: { include: { tag: true } } },
    });
  }

  /** Get tags for a file. */
  async getTags(id: string, userId: string) {
    const file = await this.findOne(id, userId);
    const fileTags = await this.prisma.fileTag.findMany({
      where: { fileId: file.id },
      include: { tag: true },
    });
    return fileTags.map((ft) => ft.tag);
  }

  // ─── US10: Download history ─────────────────────────────────────

  /** Record a download event. */
  async recordDownload(fileId: string, tokenId: string | null, ipAddress?: string, userAgent?: string) {
    return this.prisma.downloadHistory.create({
      data: { fileId, tokenId, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null },
    });
  }

  /** Get download history for a file. */
  async getDownloadHistory(id: string, userId: string) {
    const file = await this.findOne(id, userId);
    return this.prisma.downloadHistory.findMany({
      where: { fileId: file.id },
      orderBy: { downloadedAt: 'desc' },
      take: 100,
    });
  }
}

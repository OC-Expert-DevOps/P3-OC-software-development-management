import 'multer'; // Required for Express.Multer.File type
import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ManageTagsDto } from './dto/manage-tags.dto';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as FileType from 'file-type';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize: number;

  // Content-sniffed MIME types allowed for upload, checked against the real
  // file bytes via `file-type` — the client-supplied filename/extension and
  // Content-Type header are not trusted (both are trivially spoofable).
  private readonly allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'audio/mpeg',
  ]);

  // `file-type` cannot fingerprint plain-text formats (no magic bytes). These
  // are allowed only if the client-declared type matches AND the content is
  // verified to actually look like text — see looksLikeText().
  private readonly allowedTextMimeTypes = new Set(['text/plain', 'text/csv']);

  // Reduces (does not eliminate — see SECURITY.md) the blind spot where valid
  // UTF-8 markup/script content sails through as "it's just text": rejects a
  // text/plain or text/csv upload that contains common script/embed markers.
  // Trade-off accepted: a text file whose legitimate content happens to
  // contain one of these substrings (e.g. a tutorial snippet) is a false
  // positive.
  private readonly suspiciousTextPatterns = [
    /<script[\s>]/i,
    /<\?php/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i,
    /<svg[\s>]/i,
    /javascript:/i,
    /\bon[a-z]+\s*=\s*["']/i, // onerror=, onload=, onclick=...
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly config: ConfigService,
  ) {
    this.maxFileSize = this.config.get<number>('MAX_FILE_SIZE_BYTES', 1073741824);
  }

  /**
   * Validate the file's real content type by sniffing its magic bytes,
   * against an explicit whitelist.
   */
  private async assertAllowedFileType(file: Express.Multer.File): Promise<void> {
    const detected = await FileType.fromBuffer(file.buffer);

    if (detected) {
      if (!this.allowedMimeTypes.has(detected.mime)) {
        throw new BadRequestException(`File type not allowed: ${detected.mime}`);
      }
      return;
    }

    if (!this.allowedTextMimeTypes.has(file.mimetype) || !this.looksLikeText(file.buffer)) {
      throw new BadRequestException('File type not allowed or could not be verified');
    }
  }

  /** Heuristic used only for formats file-type cannot fingerprint (plain text/CSV). */
  private looksLikeText(buffer: Buffer): boolean {
    const sample = buffer.subarray(0, 8000);
    for (const byte of sample) {
      if (byte === 0x00) return false;
      if (byte < 0x07 || (byte > 0x0d && byte < 0x20)) return false;
    }
    const text = sample.toString('utf8');
    return !this.suspiciousTextPatterns.some((pattern) => pattern.test(text));
  }

  /** Strip the password hash before a File record is returned to the client. */
  private toSafeFile<T extends { passwordHash?: string | null }>(file: T) {
    const { passwordHash, ...safe } = file;
    return { ...safe, hasPassword: !!passwordHash };
  }

  async uploadFile(userId: string, file: Express.Multer.File, dto?: UploadFileDto) {
    try {
      if (!file) throw new BadRequestException('No file provided');

      if (file.size > this.maxFileSize) {
        throw new BadRequestException('File size exceeds maximum allowed');
      }

      await this.assertAllowedFileType(file);

      const key = `${userId}/${randomUUID()}-${file.originalname}`;

      await this.minioService.uploadFile(key, file.buffer, file.mimetype);

      const expiryDays = dto?.expiryDays ?? this.config.get<number>('FILE_EXPIRY_DAYS_DEFAULT', 7);
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      let passwordHash: string | null = null;
      if (dto?.password) {
        passwordHash = await bcrypt.hash(dto.password, 10);
      }

      const created = await this.prisma.file.create({
        data: {
          userId,
          originalName: file.originalname,
          storageKey: key,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          expiresAt,
          passwordHash,
        },
      });

      return this.toSafeFile(created);
    } catch (err) {
      this.logger.error('uploadFile failed', err as any);
      throw err;
    }
  }

  async findAllByUser(userId: string) {
    try {
      const files = await this.prisma.file.findMany({
        where: { userId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      return files.map(f => ({
        id: f.id,
        originalName: f.originalName,
        storageKey: f.storageKey,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes.toString(),
        expiresAt: f.expiresAt,
        createdAt: f.createdAt,
        hasPassword: !!f.passwordHash,
      }));
    } catch (err) {
      this.logger.error('findAllByUser failed', err as any);
      throw err;
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const file = await this.prisma.file.findUnique({ where: { id } });
      if (!file) throw new NotFoundException('File not found');
      if (file.userId !== userId) throw new ForbiddenException('Access denied');
      if (file.isDeleted) throw new NotFoundException('File not found');
      return this.toSafeFile(file);
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

  /** Aggregate stats for the authenticated user. */
  async getStats(userId: string) {
    const files = await this.prisma.file.findMany({
      where: { userId, isDeleted: false },
      select: { sizeBytes: true, expiresAt: true },
    });

    const now = new Date();
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, f) => sum + Number(f.sizeBytes), 0);
    const activeFiles = files.filter(f => f.expiresAt > now).length;
    const expiredFiles = totalFiles - activeFiles;

    return { totalFiles, activeFiles, expiredFiles, totalSizeBytes: totalSize.toString() };
  }

  /** Set a password on an existing file. */
  async setPassword(id: string, userId: string, dto: SetPasswordDto) {
    await this.findOne(id, userId);
    const hash = await bcrypt.hash(dto.password, 10);
    await this.prisma.file.update({ where: { id }, data: { passwordHash: hash } });
    this.logger.log(`Password set on file ${id}`);
    return { message: 'Password set' };
  }

  /** Remove the password from a file. */
  async removePassword(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.file.update({ where: { id }, data: { passwordHash: null } });
    this.logger.log(`Password removed from file ${id}`);
  }

  /** Upload a file without authentication (anonymous). */
  async uploadAnonymous(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds maximum allowed');
    }

    await this.assertAllowedFileType(file);

    const key = `anonymous/${randomUUID()}-${file.originalname}`;
    await this.minioService.uploadFile(key, file.buffer, file.mimetype);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day for anonymous

    const created = await this.prisma.file.create({
      data: {
        userId: null,
        originalName: file.originalname,
        storageKey: key,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        expiresAt,
      },
    });

    this.logger.log(`Anonymous file uploaded: ${created.id}`);
    return this.toSafeFile(created);
  }

  /** Set tags on a file (replace all). */
  async setTags(id: string, userId: string, dto: ManageTagsDto) {
    await this.findOne(id, userId);

    // Upsert tags and link them
    const tagRecords = await Promise.all(
      dto.tags.map(async (name) => {
        const normalized = name.trim().toLowerCase();
        return this.prisma.tag.upsert({
          where: { name: normalized },
          create: { name: normalized },
          update: {},
        });
      }),
    );

    // Remove existing file-tag links, then recreate
    await this.prisma.fileTag.deleteMany({ where: { fileId: id } });
    await this.prisma.fileTag.createMany({
      data: tagRecords.map(t => ({ fileId: id, tagId: t.id })),
    });

    this.logger.log(`Tags set on file ${id}: ${dto.tags.join(', ')}`);
    return { tags: tagRecords.map(t => t.name) };
  }

  /** Get tags for a file. */
  async getTags(id: string, userId: string) {
    await this.findOne(id, userId);
    const fileTags = await this.prisma.fileTag.findMany({
      where: { fileId: id },
      include: { tag: true },
    });
    return { tags: fileTags.map(ft => ft.tag.name) };
  }

  /** Get download history for a file. */
  async getHistory(id: string, userId: string) {
    await this.findOne(id, userId);
    const history = await this.prisma.downloadHistory.findMany({
      where: { fileId: id },
      orderBy: { downloadedAt: 'desc' },
      select: {
        id: true,
        downloadedAt: true,
        ipAddress: true,
        userAgent: true,
        tokenId: true,
      },
    });
    return history;
  }
}

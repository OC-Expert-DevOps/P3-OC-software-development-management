import 'multer'; // Required for Express.Multer.File type
import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';

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
}

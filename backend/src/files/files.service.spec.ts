import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

const mockPrisma = {
  file: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  downloadToken: {
    updateMany: jest.fn(),
  },
};

const mockMinio = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getPresignedUrl: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, number> = {
      MAX_FILE_SIZE_BYTES: 10485760,
      FILE_EXPIRY_DAYS_DEFAULT: 7,
    };
    return map[key];
  }),
};

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const file = {
      originalname: 'document.txt',
      mimetype: 'text/plain',
      size: 1024,
      buffer: Buffer.from('hello'),
    } as any;

    it('should upload file and create a DB record', async () => {
      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.file.create.mockResolvedValue({
        id: 'file-1',
        userId: 'user-1',
        originalName: 'document.txt',
        storagePath: 'user-1/random-document.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      });

      const result = await service.uploadFile('user-1', file);

      expect(mockMinio.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('user-1/'),
        file.buffer,
        'text/plain',
      );
      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            originalName: 'document.txt',
            mimeType: 'text/plain',
            sizeBytes: 1024,
          }),
        }),
      );
      expect(result.id).toBe('file-1');
    });

    it('should throw BadRequestException when file is too large', async () => {
      const largeFile = { ...file, size: 10485761 } as any;
      await expect(service.uploadFile('user-1', largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for forbidden extension', async () => {
      const badFile = { ...file, originalname: 'virus.exe' } as any;
      await expect(service.uploadFile('user-1', badFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set expiresAt based on expiryDays', async () => {
      const dto = { expiryDays: 3 };
      let createdData: any;

      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.file.create.mockImplementation(async (args) => {
        createdData = args.data;
        return { id: 'file-2', ...args.data };
      });

      const result = await service.uploadFile('user-1', file, dto);

      expect(result.id).toBe('file-2');
      expect(createdData.expiresAt).toBeInstanceOf(Date);
      const expected = Date.now() + 3 * 24 * 60 * 60 * 1000;
      expect(createdData.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expected - 1000,
      );
      expect(createdData.expiresAt.getTime()).toBeLessThanOrEqual(
        expected + 1000,
      );
    });
  });

  describe('findAllByUser', () => {
    it('should return only non-deleted files for the user', async () => {
      const files = [
        { id: 'file-1', userId: 'user-1', isDeleted: false },
        { id: 'file-2', userId: 'user-1', isDeleted: false },
      ];
      mockPrisma.file.findMany.mockResolvedValue(files);

      const result = await service.findAllByUser('user-1');

      expect(result).toEqual(files);
      expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return an empty array when there are no files', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return the file when the user is the owner', async () => {
      const file = { id: 'file-1', userId: 'user-1', isDeleted: false };
      mockPrisma.file.findUnique.mockResolvedValue(file);

      const result = await service.findOne('file-1', 'user-1');

      expect(result).toEqual(file);
      expect(mockPrisma.file.findUnique).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });

    it('should throw NotFoundException when the file does not exist', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await expect(service.findOne('file-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete from MinIO, mark as deleted, and invalidate tokens', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        storageKey: 'user-1/file.txt',
        isDeleted: false,
      };
      mockPrisma.file.findUnique.mockResolvedValue(file);
      mockMinio.deleteFile.mockResolvedValue(undefined);
      mockPrisma.file.update.mockResolvedValue({ ...file, isDeleted: true });
      mockPrisma.downloadToken.updateMany.mockResolvedValue({ count: 1 });

      await service.remove('file-1', 'user-1');

      expect(mockMinio.deleteFile).toHaveBeenCalledWith('user-1/file.txt');
      expect(mockPrisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { isDeleted: true },
      });
      expect(mockPrisma.downloadToken.updateMany).toHaveBeenCalledWith({
        where: { fileId: 'file-1' },
        data: { expiresAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenException when the user does not own the file', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-2',
        storageKey: 'user-2/file.txt',
        isDeleted: false,
      };
      mockPrisma.file.findUnique.mockResolvedValue(file);

      await expect(service.remove('file-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

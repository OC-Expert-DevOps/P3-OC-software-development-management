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
            sizeBytes: BigInt(1024),
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

    it('should rename a forbidden extension but still reject the file based on its real content', async () => {
      // A file renamed to look harmless (.txt) but whose magic bytes are a real
      // gzip archive — file-type must catch this from the content, not the name.
      const gzipFile = {
        ...file,
        originalname: 'not-a-virus.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03]),
      } as any;
      await expect(service.uploadFile('user-1', gzipFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when declared text/plain content is actually binary', async () => {
      const binaryFile = {
        ...file,
        mimetype: 'text/plain',
        buffer: Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]),
      } as any;
      await expect(service.uploadFile('user-1', binaryFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept a real PNG image regardless of its declared mimetype', async () => {
      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.file.create.mockResolvedValue({ id: 'file-3' });

      const pngFile = {
        ...file,
        originalname: 'photo.png',
        mimetype: 'application/octet-stream', // deliberately wrong declared type
        // file-type needs more than just the 8-byte signature to avoid an
        // end-of-stream read error, hence the padding.
        buffer: Buffer.concat([
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          Buffer.alloc(64),
        ]),
      } as any;

      const result = await service.uploadFile('user-1', pngFile);
      expect(result.id).toBe('file-3');
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
    it('should map DB records to the safe list shape (no passwordHash, sizeBytes as string)', async () => {
      const now = new Date();
      const files = [
        {
          id: 'file-1',
          userId: 'user-1',
          isDeleted: false,
          originalName: 'a.txt',
          storageKey: 'user-1/a.txt',
          mimeType: 'text/plain',
          sizeBytes: BigInt(2048),
          expiresAt: now,
          createdAt: now,
          passwordHash: null,
        },
        {
          id: 'file-2',
          userId: 'user-1',
          isDeleted: false,
          originalName: 'b.pdf',
          storageKey: 'user-1/b.pdf',
          mimeType: 'application/pdf',
          sizeBytes: BigInt(4096),
          expiresAt: now,
          createdAt: now,
          passwordHash: '$2b$10$somebcrypthash',
        },
      ];
      mockPrisma.file.findMany.mockResolvedValue(files);

      const result = await service.findAllByUser('user-1');

      expect(result).toEqual([
        {
          id: 'file-1',
          originalName: 'a.txt',
          storageKey: 'user-1/a.txt',
          mimeType: 'text/plain',
          sizeBytes: '2048',
          expiresAt: now,
          createdAt: now,
          hasPassword: false,
        },
        {
          id: 'file-2',
          originalName: 'b.pdf',
          storageKey: 'user-1/b.pdf',
          mimeType: 'application/pdf',
          sizeBytes: '4096',
          expiresAt: now,
          createdAt: now,
          hasPassword: true,
        },
      ]);
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

      expect(result).toEqual({ ...file, hasPassword: false });
      expect(mockPrisma.file.findUnique).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });

    it('should never leak passwordHash, but should expose hasPassword', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
        passwordHash: '$2b$10$somebcrypthash',
      };
      mockPrisma.file.findUnique.mockResolvedValue(file);

      const result: any = await service.findOne('file-1', 'user-1');

      expect(result.passwordHash).toBeUndefined();
      expect(result.hasPassword).toBe(true);
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

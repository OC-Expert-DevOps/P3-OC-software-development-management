import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { SortField, SortOrder } from './dto/list-files.dto';

const mockPrisma = {
  file: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  downloadToken: {
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  downloadHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  tag: {
    upsert: jest.fn(),
  },
  fileTag: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockMinio = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getPresignedUrl: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: any) => {
    const map: Record<string, any> = {
      MAX_FILE_SIZE_BYTES: 10485760,
      FILE_EXPIRY_DAYS_DEFAULT: 7,
    };
    return map[key] ?? defaultVal;
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

  // ─── uploadFile ───────────────────────────────────────────────────

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

    it('should throw BadRequestException when no file provided', async () => {
      await expect(service.uploadFile('user-1', null as any)).rejects.toThrow(
        BadRequestException,
      );
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

    it('should reject .bat extension', async () => {
      const badFile = { ...file, originalname: 'run.bat' } as any;
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
      expect(createdData.expiresAt.getTime()).toBeGreaterThanOrEqual(expected - 1000);
      expect(createdData.expiresAt.getTime()).toBeLessThanOrEqual(expected + 1000);
    });

    it('should use default expiryDays when dto is not provided', async () => {
      let createdData: any;
      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.file.create.mockImplementation(async (args) => {
        createdData = args.data;
        return { id: 'file-3', ...args.data };
      });

      await service.uploadFile('user-1', file);

      expect(createdData.expiresAt).toBeInstanceOf(Date);
      const expected = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(createdData.expiresAt.getTime()).toBeGreaterThanOrEqual(expected - 2000);
      expect(createdData.expiresAt.getTime()).toBeLessThanOrEqual(expected + 2000);
    });
  });

  // ─── findAllByUser ────────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('should return paginated files with metadata', async () => {
      const files = [{ id: 'file-1' }, { id: 'file-2' }];
      mockPrisma.file.findMany.mockResolvedValue(files);
      mockPrisma.file.count.mockResolvedValue(2);

      const result = await service.findAllByUser('user-1');

      expect(result.data).toEqual(files);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('should apply custom pagination params', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.file.count.mockResolvedValue(50);

      const result = await service.findAllByUser('user-1', {
        page: 3,
        limit: 10,
        sortBy: SortField.ORIGINAL_NAME,
        order: SortOrder.ASC,
      });

      expect(result.meta).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
      expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
          orderBy: { originalName: 'asc' },
        }),
      );
    });

    it('should return empty array when there are no files', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.file.count.mockResolvedValue(0);

      const result = await service.findAllByUser('user-1');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ─── getStats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return file statistics for a user', async () => {
      mockPrisma.file.count
        .mockResolvedValueOnce(5)  // fileCount
        .mockResolvedValueOnce(2); // deletedCount
      mockPrisma.file.aggregate.mockResolvedValue({ _sum: { sizeBytes: BigInt(1048576) } });
      mockPrisma.downloadToken.count.mockResolvedValue(3);

      const result = await service.getStats('user-1');

      expect(result).toEqual({
        fileCount: 5,
        deletedCount: 2,
        totalSizeBytes: '1048576',
        activeLinks: 3,
      });
    });

    it('should return zero totalSizeBytes when no files', async () => {
      mockPrisma.file.count.mockResolvedValue(0);
      mockPrisma.file.aggregate.mockResolvedValue({ _sum: { sizeBytes: null } });
      mockPrisma.downloadToken.count.mockResolvedValue(0);

      const result = await service.getStats('user-1');

      expect(result.totalSizeBytes).toBe('0');
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the file when the user is the owner', async () => {
      const file = { id: 'file-1', userId: 'user-1', isDeleted: false };
      mockPrisma.file.findUnique.mockResolvedValue(file);

      const result = await service.findOne('file-1', 'user-1');

      expect(result).toEqual(file);
    });

    it('should throw NotFoundException when the file does not exist', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await expect(service.findOne('file-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the file', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-2', isDeleted: false,
      });

      await expect(service.findOne('file-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when file is deleted', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-1', isDeleted: true,
      });

      await expect(service.findOne('file-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete from MinIO, mark as deleted, and invalidate tokens', async () => {
      const file = { id: 'file-1', userId: 'user-1', storageKey: 'user-1/file.txt', isDeleted: false };
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
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-2', storageKey: 'user-2/file.txt', isDeleted: false,
      });

      await expect(service.remove('file-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── US07: Password ───────────────────────────────────────────────

  describe('setPassword', () => {
    it('should hash and store the password', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-1', isDeleted: false,
      });
      mockPrisma.file.update.mockResolvedValue({ id: 'file-1', passwordHash: 'hashed' });

      const result = await service.setPassword('file-1', 'user-1', 'secret123');

      expect(mockPrisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { passwordHash: expect.any(String) },
      });
      expect(result.passwordHash).toBeTruthy();
    });
  });

  describe('removePassword', () => {
    it('should set passwordHash to null', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-1', isDeleted: false,
      });
      mockPrisma.file.update.mockResolvedValue({ id: 'file-1', passwordHash: null });

      const result = await service.removePassword('file-1', 'user-1');

      expect(mockPrisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { passwordHash: null },
      });
      expect(result.passwordHash).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should return true when no password is set', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', isDeleted: false, passwordHash: null,
      });

      const result = await service.verifyPassword('file-1', 'anything');
      expect(result).toBe(true);
    });

    it('should throw NotFoundException for missing file', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await expect(service.verifyPassword('file-1', 'pass')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deleted file', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', isDeleted: true, passwordHash: 'hash',
      });

      await expect(service.verifyPassword('file-1', 'pass')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── US08: Anonymous upload ───────────────────────────────────────

  describe('anonymousUpload', () => {
    const file = {
      originalname: 'anon.txt',
      mimetype: 'text/plain',
      size: 512,
      buffer: Buffer.from('anon'),
    } as any;

    it('should upload without userId', async () => {
      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.file.create.mockResolvedValue({ id: 'anon-1', userId: null });

      const result = await service.anonymousUpload(file);

      expect(mockMinio.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('anonymous/'),
        file.buffer,
        'text/plain',
      );
      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null }),
        }),
      );
      expect(result.userId).toBeNull();
    });

    it('should throw BadRequestException when no file', async () => {
      await expect(service.anonymousUpload(null as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized file', async () => {
      const big = { ...file, size: 10485761 } as any;
      await expect(service.anonymousUpload(big)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for forbidden extension', async () => {
      const bad = { ...file, originalname: 'script.sh' } as any;
      await expect(service.anonymousUpload(bad)).rejects.toThrow(BadRequestException);
    });

    it('should default to 1-day expiry', async () => {
      let createdData: any;
      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.file.create.mockImplementation(async (args) => {
        createdData = args.data;
        return { id: 'anon-2', ...args.data };
      });

      await service.anonymousUpload(file);

      const expected = Date.now() + 1 * 24 * 60 * 60 * 1000;
      expect(createdData.expiresAt.getTime()).toBeGreaterThanOrEqual(expected - 2000);
      expect(createdData.expiresAt.getTime()).toBeLessThanOrEqual(expected + 2000);
    });
  });

  // ─── US09: Tags ───────────────────────────────────────────────────

  describe('setTags', () => {
    it('should upsert tags and replace file-tag associations', async () => {
      mockPrisma.file.findUnique
        .mockResolvedValueOnce({ id: 'file-1', userId: 'user-1', isDeleted: false })
        .mockResolvedValueOnce({ id: 'file-1', fileTags: [{ tag: { name: 'doc' } }] });
      mockPrisma.tag.upsert.mockResolvedValue({ id: 'tag-1', name: 'doc' });
      mockPrisma.fileTag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.fileTag.createMany.mockResolvedValue({ count: 1 });

      await service.setTags('file-1', 'user-1', ['Doc']);

      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
        where: { name: 'doc' },
        create: { name: 'doc' },
        update: {},
      });
      expect(mockPrisma.fileTag.deleteMany).toHaveBeenCalledWith({ where: { fileId: 'file-1' } });
      expect(mockPrisma.fileTag.createMany).toHaveBeenCalled();
    });
  });

  describe('getTags', () => {
    it('should return tag list for a file', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-1', isDeleted: false,
      });
      mockPrisma.fileTag.findMany.mockResolvedValue([
        { tag: { id: 't1', name: 'important' } },
        { tag: { id: 't2', name: 'work' } },
      ]);

      const result = await service.getTags('file-1', 'user-1');

      expect(result).toEqual([
        { id: 't1', name: 'important' },
        { id: 't2', name: 'work' },
      ]);
    });
  });

  // ─── US10: Download history ───────────────────────────────────────

  describe('recordDownload', () => {
    it('should create a download history entry', async () => {
      mockPrisma.downloadHistory.create.mockResolvedValue({
        id: 'dh-1', fileId: 'file-1', tokenId: 'tok-1',
        ipAddress: '1.2.3.4', userAgent: 'Mozilla',
      });

      const result = await service.recordDownload('file-1', 'tok-1', '1.2.3.4', 'Mozilla');

      expect(mockPrisma.downloadHistory.create).toHaveBeenCalledWith({
        data: { fileId: 'file-1', tokenId: 'tok-1', ipAddress: '1.2.3.4', userAgent: 'Mozilla' },
      });
      expect(result.id).toBe('dh-1');
    });

    it('should handle null tokenId and missing optional fields', async () => {
      mockPrisma.downloadHistory.create.mockResolvedValue({
        id: 'dh-2', fileId: 'file-1', tokenId: null, ipAddress: null, userAgent: null,
      });

      const result = await service.recordDownload('file-1', null);

      expect(mockPrisma.downloadHistory.create).toHaveBeenCalledWith({
        data: { fileId: 'file-1', tokenId: null, ipAddress: null, userAgent: null },
      });
      expect(result.tokenId).toBeNull();
    });
  });

  describe('getDownloadHistory', () => {
    it('should return last 100 download events', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        id: 'file-1', userId: 'user-1', isDeleted: false,
      });
      const events = [{ id: 'dh-1' }, { id: 'dh-2' }];
      mockPrisma.downloadHistory.findMany.mockResolvedValue(events);

      const result = await service.getDownloadHistory('file-1', 'user-1');

      expect(result).toEqual(events);
      expect(mockPrisma.downloadHistory.findMany).toHaveBeenCalledWith({
        where: { fileId: 'file-1' },
        orderBy: { downloadedAt: 'desc' },
        take: 100,
      });
    });
  });
});

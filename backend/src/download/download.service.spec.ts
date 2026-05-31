import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DownloadService } from './download.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

const mockPrisma = {
  file: {
    findUnique: jest.fn(),
  },
  downloadToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockMinio = {
  getPresignedUrl: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, number> = { DOWNLOAD_LINK_TTL_SECONDS: 86400 };
    return map[key];
  }),
};

describe('DownloadService', () => {
  let service: DownloadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<DownloadService>(DownloadService);
    jest.clearAllMocks();
  });

  // --- createLink ---

  describe('createLink', () => {
    const file = { id: 'file-1', userId: 'user-1', isDeleted: false };

    it('should create a download token', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(file);
      mockPrisma.downloadToken.create.mockResolvedValue({
        id: 'token-1',
        fileId: 'file-1',
        token: 'uuid-token',
        expiresAt: new Date(),
        maxDownloads: 0,
        downloadCount: 0,
      });

      const result = await service.createLink('file-1', 'user-1', {});

      expect(result.id).toBe('token-1');
      expect(mockPrisma.downloadToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fileId: 'file-1',
            maxDownloads: 0,
          }),
        }),
      );
    });

    it('should use custom ttlSeconds', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(file);
      mockPrisma.downloadToken.create.mockImplementation(async (args) => ({
        id: 'token-2',
        ...args.data,
      }));

      const result = await service.createLink('file-1', 'user-1', { ttlSeconds: 3600 });

      const data = mockPrisma.downloadToken.create.mock.calls[0][0].data;
      const expectedExpiry = Date.now() + 3600 * 1000;
      expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 2000);
      expect(data.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 2000);
    });

    it('should throw NotFoundException if file not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await expect(service.createLink('file-x', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own file', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({ ...file, userId: 'user-2' });

      await expect(service.createLink('file-1', 'user-1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  // --- findByFile ---

  describe('findByFile', () => {
    it('should return active tokens for a file', async () => {
      const file = { id: 'file-1', userId: 'user-1', isDeleted: false };
      const tokens = [{ id: 'token-1' }, { id: 'token-2' }];
      mockPrisma.file.findUnique.mockResolvedValue(file);
      mockPrisma.downloadToken.findMany.mockResolvedValue(tokens);

      const result = await service.findByFile('file-1', 'user-1');

      expect(result).toEqual(tokens);
    });
  });

  // --- revokeLink ---

  describe('revokeLink', () => {
    it('should revoke a token by setting expiresAt to now', async () => {
      const file = { id: 'file-1', userId: 'user-1', isDeleted: false };
      const token = { id: 'token-1', fileId: 'file-1' };
      mockPrisma.file.findUnique.mockResolvedValue(file);
      mockPrisma.downloadToken.findUnique.mockResolvedValue(token);
      mockPrisma.downloadToken.update.mockResolvedValue({});

      await service.revokeLink('file-1', 'token-1', 'user-1');

      expect(mockPrisma.downloadToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { expiresAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if token does not belong to file', async () => {
      const file = { id: 'file-1', userId: 'user-1', isDeleted: false };
      const token = { id: 'token-1', fileId: 'file-999' };
      mockPrisma.file.findUnique.mockResolvedValue(file);
      mockPrisma.downloadToken.findUnique.mockResolvedValue(token);

      await expect(service.revokeLink('file-1', 'token-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // --- useToken ---

  describe('useToken', () => {
    const now = new Date();
    const futureDate = new Date(Date.now() + 3600 * 1000);
    const pastDate = new Date(Date.now() - 3600 * 1000);

    it('should return presigned URL for valid token', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'valid-uuid',
        expiresAt: futureDate,
        downloadCount: 0,
        maxDownloads: 0,
        file: { storageKey: 'user-1/file.txt', isDeleted: false },
      });
      mockPrisma.downloadToken.update.mockResolvedValue({});
      mockMinio.getPresignedUrl.mockResolvedValue('https://minio/presigned');

      const url = await service.useToken('valid-uuid');

      expect(url).toBe('https://minio/presigned');
      expect(mockPrisma.downloadToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { downloadCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundException if token does not exist', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue(null);

      await expect(service.useToken('bad-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException if token has expired', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'expired-uuid',
        expiresAt: pastDate,
        downloadCount: 0,
        maxDownloads: 0,
        file: { storageKey: 'user-1/file.txt', isDeleted: false },
      });

      await expect(service.useToken('expired-uuid')).rejects.toThrow(GoneException);
    });

    it('should throw NotFoundException if file is deleted', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'uuid',
        expiresAt: futureDate,
        downloadCount: 0,
        maxDownloads: 0,
        file: { storageKey: 'user-1/file.txt', isDeleted: true },
      });

      await expect(service.useToken('uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException when maxDownloads limit reached', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'uuid',
        expiresAt: futureDate,
        downloadCount: 5,
        maxDownloads: 5,
        file: { storageKey: 'user-1/file.txt', isDeleted: false },
      });

      await expect(service.useToken('uuid')).rejects.toThrow(GoneException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

const mockPrisma = {
  file: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  downloadToken: {
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockMinio = {
  deleteFile: jest.fn(),
};

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    jest.clearAllMocks();
  });

  describe('purgeExpiredFiles', () => {
    it('should return 0 when there are no expired files', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);

      const count = await service.purgeExpiredFiles();

      expect(count).toBe(0);
      expect(mockMinio.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete expired files from MinIO and soft-delete them in DB', async () => {
      mockPrisma.file.findMany.mockResolvedValue([
        { id: 'file-1', storageKey: 'user-1/a.txt', originalName: 'a.txt' },
        { id: 'file-2', storageKey: 'user-1/b.txt', originalName: 'b.txt' },
      ]);
      mockMinio.deleteFile.mockResolvedValue(undefined);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const count = await service.purgeExpiredFiles();

      expect(count).toBe(2);
      expect(mockMinio.deleteFile).toHaveBeenCalledWith('user-1/a.txt');
      expect(mockMinio.deleteFile).toHaveBeenCalledWith('user-1/b.txt');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should skip a file that fails to purge and continue with the rest', async () => {
      mockPrisma.file.findMany.mockResolvedValue([
        { id: 'file-1', storageKey: 'user-1/a.txt', originalName: 'a.txt' },
        { id: 'file-2', storageKey: 'user-1/b.txt', originalName: 'b.txt' },
      ]);
      mockMinio.deleteFile
        .mockRejectedValueOnce(new Error('MinIO unavailable'))
        .mockResolvedValueOnce(undefined);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const count = await service.purgeExpiredFiles();

      expect(count).toBe(1);
    });
  });

  describe('purgeExpiredDownloadTokens', () => {
    it('should delete tokens expired more than 24h ago and return the count', async () => {
      mockPrisma.downloadToken.deleteMany.mockResolvedValue({ count: 3 });

      const count = await service.purgeExpiredDownloadTokens();

      expect(count).toBe(3);
      expect(mockPrisma.downloadToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });

  describe('purgeExpiredRefreshTokens', () => {
    it('should delete expired-or-revoked tokens and return the count', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const count = await service.purgeExpiredRefreshTokens();

      expect(count).toBe(5);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { isRevoked: true, createdAt: { lt: expect.any(Date) } },
          ],
        },
      });
    });
  });

  describe('handleCleanup', () => {
    it('should run all three purges', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.downloadToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await service.handleCleanup();

      expect(mockPrisma.file.findMany).toHaveBeenCalled();
      expect(mockPrisma.downloadToken.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });
});

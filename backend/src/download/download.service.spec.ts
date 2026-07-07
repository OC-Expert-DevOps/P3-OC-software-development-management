import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, GoneException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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
  downloadHistory: {
    create: jest.fn(),
  },
};

const mockMinio = {
  getFileStream: jest.fn(),
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

  // --- streamFile ---

  describe('streamFile', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    const pastDate = new Date(Date.now() - 3600 * 1000);
    const fileStream = { stream: 'fake-stream', contentType: 'text/plain', contentLength: 42 };

    const baseToken = {
      id: 'token-1',
      fileId: 'file-1',
      token: 'valid-uuid',
      expiresAt: futureDate,
      downloadCount: 0,
      maxDownloads: 0,
      file: { storageKey: 'user-1/file.txt', originalName: 'file.txt', mimeType: 'text/plain', isDeleted: false, passwordHash: null },
    };

    it('should stream the file, increment downloadCount and record history', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue(baseToken);
      mockPrisma.downloadToken.update.mockResolvedValue({});
      mockPrisma.downloadHistory.create.mockResolvedValue({});
      mockMinio.getFileStream.mockResolvedValue(fileStream);

      const result = await service.streamFile('valid-uuid', undefined, '203.0.113.5', 'jest-agent');

      expect(result.stream).toBe('fake-stream');
      expect(result.originalName).toBe('file.txt');
      expect(mockPrisma.downloadToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { downloadCount: { increment: 1 } },
      });
      expect(mockPrisma.downloadHistory.create).toHaveBeenCalledWith({
        data: { fileId: 'file-1', tokenId: 'token-1', ipAddress: '203.0.113.5', userAgent: 'jest-agent' },
      });
    });

    it('should throw NotFoundException if token does not exist', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue(null);

      await expect(service.streamFile('bad-uuid')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.downloadHistory.create).not.toHaveBeenCalled();
    });

    it('should throw GoneException if token has expired', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({ ...baseToken, expiresAt: pastDate });

      await expect(service.streamFile('valid-uuid')).rejects.toThrow(GoneException);
      expect(mockPrisma.downloadHistory.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if file is deleted', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        ...baseToken,
        file: { ...baseToken.file, isDeleted: true },
      });

      await expect(service.streamFile('valid-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException when maxDownloads limit reached', async () => {
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        ...baseToken,
        downloadCount: 5,
        maxDownloads: 5,
      });

      await expect(service.streamFile('valid-uuid')).rejects.toThrow(GoneException);
      expect(mockPrisma.downloadHistory.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is required but missing', async () => {
      const hash = await bcrypt.hash('SecurePass123!', 4);
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        ...baseToken,
        file: { ...baseToken.file, passwordHash: hash },
      });

      await expect(service.streamFile('valid-uuid')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.downloadHistory.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const hash = await bcrypt.hash('SecurePass123!', 4);
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        ...baseToken,
        file: { ...baseToken.file, passwordHash: hash },
      });

      await expect(service.streamFile('valid-uuid', 'WrongPassword')).rejects.toThrow(UnauthorizedException);
    });

    it('should stream the file when the correct password is provided', async () => {
      const hash = await bcrypt.hash('SecurePass123!', 4);
      mockPrisma.downloadToken.findUnique.mockResolvedValue({
        ...baseToken,
        file: { ...baseToken.file, passwordHash: hash },
      });
      mockPrisma.downloadToken.update.mockResolvedValue({});
      mockPrisma.downloadHistory.create.mockResolvedValue({});
      mockMinio.getFileStream.mockResolvedValue(fileStream);

      const result = await service.streamFile('valid-uuid', 'SecurePass123!');

      expect(result.stream).toBe('fake-stream');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';

const mockDownloadService = {
  createLink: jest.fn(),
  findByFile: jest.fn(),
  revokeLink: jest.fn(),
  useToken: jest.fn(),
};

const mockConfig = { get: jest.fn(() => 'test-secret-32-chars-long!!!!!!') };

describe('DownloadController', () => {
  let controller: DownloadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [
        { provide: DownloadService, useValue: mockDownloadService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<DownloadController>(DownloadController);
    jest.clearAllMocks();
  });

  describe('createLink', () => {
    it('should create a download link for a file', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { ttlSeconds: 3600 } as any;
      mockDownloadService.createLink.mockResolvedValue({ token: 'tok-1' });

      const result = await controller.createLink(req, 'file-1', dto);

      expect(mockDownloadService.createLink).toHaveBeenCalledWith('file-1', 'u1', dto);
      expect(result.token).toBe('tok-1');
    });
  });

  describe('findByFile', () => {
    it('should return links for a file', async () => {
      const req = { user: { userId: 'u1' } } as any;
      mockDownloadService.findByFile.mockResolvedValue([{ id: 'link-1' }]);

      const result = await controller.findByFile(req, 'file-1');

      expect(mockDownloadService.findByFile).toHaveBeenCalledWith('file-1', 'u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('revokeLink', () => {
    it('should revoke a download link', async () => {
      const req = { user: { userId: 'u1' } } as any;
      mockDownloadService.revokeLink.mockResolvedValue(undefined);

      await controller.revokeLink(req, 'file-1', 'link-1');

      expect(mockDownloadService.revokeLink).toHaveBeenCalledWith('file-1', 'link-1', 'u1');
    });
  });

  describe('useToken', () => {
    it('should redirect to presigned URL', async () => {
      const res = { redirect: jest.fn() } as any;
      mockDownloadService.useToken.mockResolvedValue('https://minio/presigned');

      await controller.useToken('tok-1', res);

      expect(mockDownloadService.useToken).toHaveBeenCalledWith('tok-1');
      expect(res.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, 'https://minio/presigned');
    });
  });
});

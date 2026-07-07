import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { Readable } from 'stream';

const mockDownloadService = {
  createLink: jest.fn(),
  findByFile: jest.fn(),
  revokeLink: jest.fn(),
  getTokenInfo: jest.fn(),
  streamFile: jest.fn(),
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

  describe('getTokenInfo', () => {
    it('should return file info for a valid token', async () => {
      const info = { originalName: 'test.pdf', sizeBytes: '1024', hasPassword: false };
      mockDownloadService.getTokenInfo.mockResolvedValue(info);

      const result = await controller.getTokenInfo('tok-1');

      expect(mockDownloadService.getTokenInfo).toHaveBeenCalledWith('tok-1');
      expect(result.originalName).toBe('test.pdf');
      expect(result.hasPassword).toBe(false);
    });
  });

  describe('downloadFile', () => {
    it('should stream file through backend with correct headers', async () => {
      const readable = new Readable({ read() { this.push(null); } });
      mockDownloadService.streamFile.mockResolvedValue({
        stream: readable,
        contentType: 'application/pdf',
        contentLength: 1024,
        originalName: 'test.pdf',
      });

      const res = {
        set: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      // Mock pipe
      readable.pipe = jest.fn();
      const req = { ip: '203.0.113.5', get: jest.fn(() => 'jest-agent') } as any;

      await controller.downloadFile('tok-1', undefined, req, res);

      expect(mockDownloadService.streamFile).toHaveBeenCalledWith('tok-1', undefined, '203.0.113.5', 'jest-agent');
      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      }));
      expect(readable.pipe).toHaveBeenCalledWith(res);
    });

    it('should pass password to streamFile when provided', async () => {
      const readable = new Readable({ read() { this.push(null); } });
      readable.pipe = jest.fn();
      mockDownloadService.streamFile.mockResolvedValue({
        stream: readable,
        contentType: 'text/plain',
        contentLength: 100,
        originalName: 'secret.txt',
      });

      const res = { set: jest.fn() } as any;
      const req = { ip: '203.0.113.5', get: jest.fn(() => 'jest-agent') } as any;

      await controller.downloadFile('tok-1', 'my-password', req, res);

      expect(mockDownloadService.streamFile).toHaveBeenCalledWith('tok-1', 'my-password', '203.0.113.5', 'jest-agent');
    });
  });
});

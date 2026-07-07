import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

const mockFilesService = {
  uploadAnonymous: jest.fn(),
  uploadFile: jest.fn(),
  getStats: jest.fn(),
  findAllByUser: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  setPassword: jest.fn(),
  removePassword: jest.fn(),
  setTags: jest.fn(),
  getTags: jest.fn(),
  getHistory: jest.fn(),
};

const mockConfig = { get: jest.fn(() => 'test-secret-32-chars-long!!!!!!') };

describe('FilesController', () => {
  let controller: FilesController;
  const req = { user: { userId: 'user-1' } } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: mockFilesService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    jest.clearAllMocks();
  });

  it('uploadAnonymous should delegate to the service without a user id', async () => {
    const file = { originalname: 'a.txt' } as any;
    mockFilesService.uploadAnonymous.mockResolvedValue({ id: 'file-1' });

    const result = await controller.uploadAnonymous(file);

    expect(mockFilesService.uploadAnonymous).toHaveBeenCalledWith(file);
    expect(result.id).toBe('file-1');
  });

  it('uploadFile should delegate to the service with the authenticated user id', async () => {
    const file = { originalname: 'a.txt' } as any;
    const dto = { expiryDays: 3 } as any;
    mockFilesService.uploadFile.mockResolvedValue({ id: 'file-1' });

    await controller.uploadFile(req, file, dto);

    expect(mockFilesService.uploadFile).toHaveBeenCalledWith('user-1', file, dto);
  });

  it('getStats should delegate to the service', async () => {
    mockFilesService.getStats.mockResolvedValue({ totalFiles: 2 });

    const result = await controller.getStats(req);

    expect(mockFilesService.getStats).toHaveBeenCalledWith('user-1');
    expect(result.totalFiles).toBe(2);
  });

  it('findAll should delegate to the service', async () => {
    mockFilesService.findAllByUser.mockResolvedValue([{ id: 'file-1' }]);

    const result = await controller.findAll(req);

    expect(mockFilesService.findAllByUser).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
  });

  it('findOne should delegate to the service with id and user id', async () => {
    mockFilesService.findOne.mockResolvedValue({ id: 'file-1' });

    const result = await controller.findOne(req, 'file-1');

    expect(mockFilesService.findOne).toHaveBeenCalledWith('file-1', 'user-1');
    expect(result.id).toBe('file-1');
  });

  it('remove should delegate to the service', async () => {
    mockFilesService.remove.mockResolvedValue(undefined);

    await controller.remove(req, 'file-1');

    expect(mockFilesService.remove).toHaveBeenCalledWith('file-1', 'user-1');
  });

  it('setPassword should delegate to the service', async () => {
    const dto = { password: 'secret123' } as any;
    mockFilesService.setPassword.mockResolvedValue({ message: 'Password set' });

    const result = await controller.setPassword(req, 'file-1', dto);

    expect(mockFilesService.setPassword).toHaveBeenCalledWith('file-1', 'user-1', dto);
    expect(result.message).toBe('Password set');
  });

  it('removePassword should delegate to the service', async () => {
    mockFilesService.removePassword.mockResolvedValue(undefined);

    await controller.removePassword(req, 'file-1');

    expect(mockFilesService.removePassword).toHaveBeenCalledWith('file-1', 'user-1');
  });

  it('setTags should delegate to the service', async () => {
    const dto = { tags: ['a', 'b'] } as any;
    mockFilesService.setTags.mockResolvedValue({ tags: ['a', 'b'] });

    const result = await controller.setTags(req, 'file-1', dto);

    expect(mockFilesService.setTags).toHaveBeenCalledWith('file-1', 'user-1', dto);
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('getTags should delegate to the service', async () => {
    mockFilesService.getTags.mockResolvedValue({ tags: ['a'] });

    const result = await controller.getTags(req, 'file-1');

    expect(mockFilesService.getTags).toHaveBeenCalledWith('file-1', 'user-1');
    expect(result.tags).toEqual(['a']);
  });

  it('getHistory should delegate to the service', async () => {
    mockFilesService.getHistory.mockResolvedValue([{ id: 'h1' }]);

    const result = await controller.getHistory(req, 'file-1');

    expect(mockFilesService.getHistory).toHaveBeenCalledWith('file-1', 'user-1');
    expect(result).toHaveLength(1);
  });
});

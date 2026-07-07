import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should report status ok with a timestamp', () => {
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });
});

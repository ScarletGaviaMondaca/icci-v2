import { Test, TestingModule } from '@nestjs/testing';
import { ExalumnosController } from './exalumnos.controller';

describe('ExalumnosController', () => {
  let controller: ExalumnosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExalumnosController],
    }).compile();

    controller = module.get<ExalumnosController>(ExalumnosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

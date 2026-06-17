import { Test, TestingModule } from '@nestjs/testing';
import { GeneradoresController } from './generadores.controller';

describe('GeneradoresController', () => {
  let controller: GeneradoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneradoresController],
    }).compile();

    controller = module.get<GeneradoresController>(GeneradoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

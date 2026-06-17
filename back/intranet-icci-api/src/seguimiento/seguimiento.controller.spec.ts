import { Test, TestingModule } from '@nestjs/testing';
import { SeguimientoController } from './seguimiento.controller';

describe('SeguimientoController', () => {
  let controller: SeguimientoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeguimientoController],
    }).compile();

    controller = module.get<SeguimientoController>(SeguimientoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

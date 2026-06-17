import { Test, TestingModule } from '@nestjs/testing';
import { MapaController } from './mapa.controller';

describe('MapaController', () => {
  let controller: MapaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapaController],
    }).compile();

    controller = module.get<MapaController>(MapaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

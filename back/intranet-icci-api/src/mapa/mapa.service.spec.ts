import { Test, TestingModule } from '@nestjs/testing';
import { MapaService } from './mapa.service';

describe('MapaService', () => {
  let service: MapaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapaService],
    }).compile();

    service = module.get<MapaService>(MapaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

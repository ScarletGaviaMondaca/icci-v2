import { Test, TestingModule } from '@nestjs/testing';
import { OfertasService } from './ofertas.service';

describe('OfertasService', () => {
  let service: OfertasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OfertasService],
    }).compile();

    service = module.get<OfertasService>(OfertasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SeguimientoService } from './seguimiento.service';

describe('SeguimientoService', () => {
  let service: SeguimientoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeguimientoService],
    }).compile();

    service = module.get<SeguimientoService>(SeguimientoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

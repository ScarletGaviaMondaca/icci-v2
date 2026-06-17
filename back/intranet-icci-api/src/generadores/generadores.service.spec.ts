import { Test, TestingModule } from '@nestjs/testing';
import { GeneradoresService } from './generadores.service';

describe('GeneradoresService', () => {
  let service: GeneradoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneradoresService],
    }).compile();

    service = module.get<GeneradoresService>(GeneradoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

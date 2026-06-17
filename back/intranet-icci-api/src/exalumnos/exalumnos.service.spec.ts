import { Test, TestingModule } from '@nestjs/testing';
import { ExalumnosService } from './exalumnos.service';

describe('ExalumnosService', () => {
  let service: ExalumnosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExalumnosService],
    }).compile();

    service = module.get<ExalumnosService>(ExalumnosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Module } from '@nestjs/common';
import { ProfesoresService } from './profesores.service';
import { ProfesoresController } from './profesores.controller';

@Module({
  providers: [ProfesoresService],
  controllers: [ProfesoresController]
})
export class ProfesoresModule {}

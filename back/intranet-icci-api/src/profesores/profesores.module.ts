import { Module } from '@nestjs/common';
import { ProfesoresController } from './profesores.controller';
import { ProfesoresService } from './profesores.service';

@Module({
  providers: [ProfesoresService],
  controllers: [ProfesoresController],
})
export class ProfesoresModule {}

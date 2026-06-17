import { Module } from '@nestjs/common';
import { AlumnosService } from './alumnos.service';
import { AlumnosController } from './alumnos.controller';

@Module({
  providers: [AlumnosService],
  controllers: [AlumnosController]
})
export class AlumnosModule {}

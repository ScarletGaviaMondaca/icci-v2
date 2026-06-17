import { Module } from '@nestjs/common';
import { ExalumnosService } from './exalumnos.service';
import { ExalumnosController } from './exalumnos.controller';

@Module({
  providers: [ExalumnosService],
  controllers: [ExalumnosController]
})
export class ExalumnosModule {}

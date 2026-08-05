import { Module } from '@nestjs/common';
import { SubrogantesService } from './subrogancias.service';
import { SubrogantesController } from './subrogancias.controller';

@Module({
  providers: [SubrogantesService],
  controllers: [SubrogantesController],
})
export class SubrogantesModule {}

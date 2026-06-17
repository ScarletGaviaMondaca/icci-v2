import { Module } from '@nestjs/common';
import { GeneradoresService } from './generadores.service';
import { GeneradoresController } from './generadores.controller';

@Module({
  providers: [GeneradoresService],
  controllers: [GeneradoresController],
  exports: [GeneradoresService],
})
export class GeneradoresModule {}

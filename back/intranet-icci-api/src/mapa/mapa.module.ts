import { Module } from '@nestjs/common';
import { MapaService } from './mapa.service';
import { MapaController } from './mapa.controller';

@Module({
  providers: [MapaService],
  controllers: [MapaController]
})
export class MapaModule {}

import { Module } from '@nestjs/common';
import { SeguimientoService } from './seguimiento.service';
import { SeguimientoController } from './seguimiento.controller';
import { GeneradoresModule } from '../generadores/generadores.module';

@Module({
  imports: [GeneradoresModule],
  providers: [SeguimientoService],
  controllers: [SeguimientoController]
})
export class SeguimientoModule {}

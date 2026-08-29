import { Module } from '@nestjs/common';
import { SeguimientoService } from './seguimiento.service';
import { SeguimientoController } from './seguimiento.controller';
import { GeneradoresModule } from '../generadores/generadores.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [GeneradoresModule, MailModule],
  providers: [SeguimientoService],
  controllers: [SeguimientoController]
})
export class SeguimientoModule {}

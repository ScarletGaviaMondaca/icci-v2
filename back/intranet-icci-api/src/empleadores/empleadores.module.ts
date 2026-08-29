import { Module } from '@nestjs/common';
import { EmpleadoresController } from './empleadores.controller';
import { EmpleadoresService } from './empleadores.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [EmpleadoresController],
  providers: [EmpleadoresService],
})
export class EmpleadoresModule {}

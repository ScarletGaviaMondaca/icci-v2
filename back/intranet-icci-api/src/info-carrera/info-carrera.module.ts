import { Module } from '@nestjs/common';
import { InfoCarreraController } from './info-carrera.controller';
import { InfoCarreraService } from './info-carrera.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InfoCarreraController],
  providers: [InfoCarreraService],
})
export class InfoCarreraModule {}

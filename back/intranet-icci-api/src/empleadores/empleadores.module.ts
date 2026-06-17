import { Module } from '@nestjs/common';
import { EmpleadoresController } from './empleadores.controller';
import { EmpleadoresService } from './empleadores.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmpleadoresController],
  providers: [EmpleadoresService],
})
export class EmpleadoresModule {}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfesoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(soloActivos = false) {
    return this.prisma.profesores.findMany({
      where: soloActivos ? { activo: 1 } : undefined,
      orderBy: { apellido1: 'asc' },
    });
  }
}

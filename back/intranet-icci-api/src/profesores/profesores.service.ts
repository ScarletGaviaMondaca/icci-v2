import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findOne(id: number) {
    const prof = await this.prisma.profesores.findUnique({ where: { id } });
    if (!prof) throw new NotFoundException('Profesor no encontrado');
    return prof;
  }

  async create(data: any) {
    return this.prisma.profesores.create({ data });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    return this.prisma.profesores.update({ where: { id }, data });
  }

  async toggleActivo(id: number) {
    const prof = await this.findOne(id);
    return this.prisma.profesores.update({
      where: { id },
      data: { activo: prof.activo === 1 ? 0 : 1 },
    });
  }
}
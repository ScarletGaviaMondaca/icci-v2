import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.empresas.findMany({
      include: {
        empleadores: true,
        seguimientos: {
          include: {
            alumno: {
              select: {
                rut: true,
                nombres: true,
                apellido1: true,
                apellido2: true,
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const empresa = await this.prisma.empresas.findUnique({
      where: { id },
      include: {
        empleadores: true,
        seguimientos: {
          include: {
            alumno: {
              select: {
                rut: true,
                nombres: true,
                apellido1: true,
                apellido2: true,
              },
            },
          },
        },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  async create(data: any) {
    return this.prisma.empresas.create({ data });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    return this.prisma.empresas.update({ where: { id }, data });
  }

  async toggleActivo(id: number) {
    const empresa = await this.findOne(id);
    return this.prisma.empresas.update({
      where: { id },
      data: { activo: empresa.activo === 1 ? 0 : 1 },
    });
  }

  // Empleadores
  async findEmpleadores(empresa_id: number) {
    return this.prisma.empleadores.findMany({
      where: { empresa_id },
    });
  }

  async createEmpleador(data: any) {
    return this.prisma.empleadores.create({ data });
  }

  async updateEmpleador(id: number, data: any) {
    return this.prisma.empleadores.update({ where: { id }, data });
  }
}
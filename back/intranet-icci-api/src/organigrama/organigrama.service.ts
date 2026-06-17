import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganigramaService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organigrama.findMany({
      orderBy: { dpto: 'asc' },
    });
  }
  async findOne(id: number) {
    const miembro = await this.prisma.organigrama.findUnique({ where: { id } });
    if (!miembro) throw new NotFoundException('Miembro no encontrado');
    return miembro;
  }
  async create(data: any) {
    const { accion, id, foto, ...rest } = data;
    return this.prisma.organigrama.create({
      data: {
        nombre: rest.nombre,
        rol: rest.rol,
        dpto: rest.dpto,
        correo: rest.correo,
        lugar: rest.lugar,
        telefono: rest.telefono || null,
        perfil_url: rest.perfil_url || null,
        ruta_foto: foto || null,
      },
    });
  }
  async update(id: number, data: any) {
    await this.findOne(id);
    const { accion, id: _id, foto, ...rest } = data;
    return this.prisma.organigrama.update({
      where: { id },
      data: {
        nombre: rest.nombre,
        rol: rest.rol,
        dpto: rest.dpto,
        correo: rest.correo,
        lugar: rest.lugar,
        telefono: rest.telefono || null,
        perfil_url: rest.perfil_url || null,
        ...(foto ? { ruta_foto: foto } : {}),
      },
    });
  }
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.organigrama.delete({ where: { id } });
  }
}
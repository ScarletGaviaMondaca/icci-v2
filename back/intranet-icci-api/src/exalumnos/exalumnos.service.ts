import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExalumnosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.exalumnos.findMany({
      include: {
        emails: true,
        telefonos: true,
        trabajos: true,
      },
      orderBy: { paterno: 'asc' },
    });
  }

  async findOne(id: number) {
    const ex = await this.prisma.exalumnos.findUnique({
      where: { id },
      include: {
        emails: true,
        telefonos: true,
        trabajos: true,
      },
    });
    if (!ex) throw new NotFoundException('Exalumno no encontrado');
    return ex;
  }

  async findByRut(rut: string) {
    return this.prisma.exalumnos.findUnique({
      where: { rut },
      include: { emails: true, telefonos: true, trabajos: true },
    });
  }

  async search(query: string) {
    return this.prisma.exalumnos.findMany({
      where: {
        OR: [
          { nombres: { contains: query } },
          { paterno: { contains: query } },
          { materno: { contains: query } },
          { rut: { contains: query } },
        ],
      },
      take: 20,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.exalumnos.delete({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.exalumnos.create({ data });
  }

  async update(id: number, data: any) {
    await this.findOne(id);

    const { id: _id, created_at, emails, telefonos, trabajos, ...campos } = data;

    const toStr = (v: any) => (v !== '' && v != null) ? String(v) : null;
    const toInt = (v: any) => {
      if (v === '' || v == null) return null;
      const n = parseInt(String(v).replace(/\D/g, ''));
      return isNaN(n) ? null : n;
    };

    return this.prisma.exalumnos.update({
      where: { id },
      data: {
        nombres:         toStr(campos.nombres),
        paterno:         toStr(campos.paterno),
        materno:         toStr(campos.materno),
        anio_ingreso:    toInt(campos.anio_ingreso),
        anio_titulacion: toInt(campos.anio_titulacion),
        nombre_carrera:  toStr(campos.nombre_carrera),
        facultad:        toStr(campos.facultad),
        nombre_titulo:   toStr(campos.nombre_titulo),
        emails: {
          deleteMany: {},
          create: (emails || [])
            .map((e: any) => (typeof e === 'string' ? e : (e.email ?? '')))
            .filter((e: string) => e.trim() !== '')
            .map((email: string) => ({ email })),
        },
        telefonos: {
          deleteMany: {},
          create: (telefonos || [])
            .map((t: any) => (typeof t === 'string' ? t : (t.telefono ?? '')))
            .filter((t: string) => t.trim() !== '')
            .map((telefono: string) => ({ telefono })),
        },
        trabajos: {
          deleteMany: {},
          create: (trabajos || []).map((t: any) => ({
            empresa:           toStr(t.empresa),
            cargo:             toStr(t.cargo),
            sueldo_aproximado: toInt(t.sueldo_aproximado),
            actual:            Boolean(t.actual),
          })),
        },
      },
    });
  }
}
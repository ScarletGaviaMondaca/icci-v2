import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InfoCarreraService {
  constructor(private prisma: PrismaService) {}

  async findOne() {
    const info = await this.prisma.info_carrera.findFirst();
    if (!info) throw new NotFoundException('Información de carrera no encontrada');
    return info;
  }

  async update(data: any) {
    const info = await this.findOne();
    await this.prisma.info_carrera.update({
      where: { id: info.id },
      data: {
        nombre:            data.nombre            ?? undefined,
        codigo_demre:      data.codigo_demre      ?? undefined,
        grado_titulo:      data.grado_titulo      ?? undefined,
        facultad:          data.facultad          ?? undefined,
        departamento:      data.departamento      ?? undefined,
        director:          data.director          ?? undefined,
        duracion:          data.duracion          ?? undefined,
        modalidad:         data.modalidad         ?? undefined,
        jornada:           data.jornada           ?? undefined,
        sede:              data.sede              ?? undefined,
        anio_creacion:     data.anio_creacion     ?? undefined,
        ultima_modif_plan: data.ultima_modif_plan ?? undefined,
        perfil_egreso:     data.perfil_egreso     ?? undefined,
      },
    });
    return { success: true };
  }
}

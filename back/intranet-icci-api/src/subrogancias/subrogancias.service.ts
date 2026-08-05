import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ROLES_SUPLIBLES = ['jefe_carrera', 'director_departamento'];

// Quién puede designar subrogante para cada rol: cada secretaría solo puede
// gestionar la subrogancia de "su" jefatura.
const ENCARGADO_POR_ROL: Record<string, string> = {
  jefe_carrera: 'secretaria',
  director_departamento: 'secretaria_dici',
};

@Injectable()
export class SubrogantesService {
  constructor(private prisma: PrismaService) {}

  private verificarPermiso(actorRol: string, rolSuplido: string) {
    if (!ROLES_SUPLIBLES.includes(rolSuplido)) {
      throw new BadRequestException('Rol suplido inválido');
    }
    if (actorRol === 'admin') return;
    if (ENCARGADO_POR_ROL[rolSuplido] !== actorRol) {
      throw new ForbiddenException('No tienes permisos para gestionar esta subrogancia');
    }
  }

  async getActiva(rolSuplido: string) {
    return this.prisma.subrogancias.findFirst({
      where: { rol_suplido: rolSuplido, activo: 1 },
      include: { profesor: true },
    });
  }

  async activar(profesorId: number, rolSuplido: string, creadoPor: string, actorRol: string) {
    this.verificarPermiso(actorRol, rolSuplido);

    const tieneLogin = await this.prisma.usuarios.findFirst({
      where: { profesor_id: profesorId, rol: 'profesor' },
    });
    if (!tieneLogin) {
      throw new BadRequestException('Este profesor no tiene una cuenta con rol profesor activa');
    }

    await this.prisma.subrogancias.updateMany({
      where: { rol_suplido: rolSuplido, activo: 1 },
      data: { activo: 0, fecha_fin: new Date() },
    });

    return this.prisma.subrogancias.create({
      data: { profesor_id: profesorId, rol_suplido: rolSuplido, creado_por: creadoPor },
      include: { profesor: true },
    });
  }

  async desactivar(id: number, actorRol: string) {
    const sub = await this.prisma.subrogancias.findUnique({ where: { id } });
    if (sub) this.verificarPermiso(actorRol, sub.rol_suplido);

    return this.prisma.subrogancias.update({
      where: { id },
      data: { activo: 0, fecha_fin: new Date() },
    });
  }

  async getMiEstado(profesorId: number) {
    const activas = await this.prisma.subrogancias.findMany({
      where: { profesor_id: profesorId, activo: 1 },
    });
    return { rolesSuplidos: activas.map(a => a.rol_suplido) };
  }
}

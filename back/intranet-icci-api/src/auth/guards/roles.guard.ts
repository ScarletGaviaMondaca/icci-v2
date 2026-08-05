import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

// Roles que pueden delegarse temporalmente en un profesor mediante subrogancia.
const ROLES_SUPLIBLES = ['jefe_carrera', 'director_departamento'];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (roles.includes(user.rol)) return true;

    // Profesor designado subrogante del jefe de carrera o del director de
    // departamento: hereda temporalmente los permisos de ese rol sin cambiar
    // su rol real ni tener que volver a loguearse.
    const rolSuplido = ROLES_SUPLIBLES.find(r => roles.includes(r));
    if (rolSuplido && user.rol === 'profesor' && user.profesor_id) {
      const activa = await this.prisma.subrogancias.findFirst({
        where: { profesor_id: user.profesor_id, rol_suplido: rolSuplido, activo: 1 },
      });
      if (activa) return true;
    }

    throw new ForbiddenException('No tienes permisos para esta acción');
  }
}
import { Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  // ── Seguimiento (admin / secretaria) — static routes first ──────

  @Get('seguimiento')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'director_departamento', 'secretaria_dici')
  findAllSeguimiento() {
    return this.notificacionesService.findAllSeguimiento();
  }

  @Get('seguimiento/count')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'director_departamento', 'secretaria_dici')
  countNoLeidasSeguimiento() {
    return this.notificacionesService.countNoLeidasSeguimiento();
  }

  @Put('seguimiento/leer-todas')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'director_departamento', 'secretaria_dici')
  marcarTodasLeidasSeguimiento() {
    return this.notificacionesService.marcarTodasLeidasSeguimiento();
  }

  @Put('seguimiento/:id/leer')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'director_departamento', 'secretaria_dici')
  marcarLeidaSeguimiento(@Param('id') id: string) {
    return this.notificacionesService.marcarLeidaSeguimiento(+id);
  }

  // ── Alumno ────────────────────────────────────────────────────────

  @Get('alumno/:alumno_id/count')
  @Roles('admin', 'secretaria', 'alumno')
  countNoLeidasAlumno(@Param('alumno_id') alumno_id: string) {
    return this.notificacionesService.countNoLeidasAlumno(+alumno_id);
  }

  @Get('alumno/:alumno_id')
  @Roles('admin', 'secretaria', 'alumno')
  findByAlumno(@Param('alumno_id') alumno_id: string) {
    return this.notificacionesService.findByAlumno(+alumno_id);
  }

  @Put('alumno/:alumno_id/leer-todas')
  @Roles('admin', 'secretaria', 'alumno')
  marcarTodasLeidasAlumno(@Param('alumno_id') alumno_id: string) {
    return this.notificacionesService.marcarTodasLeidasAlumno(+alumno_id);
  }

  @Put(':id/leer')
  @Roles('admin', 'secretaria', 'alumno')
  marcarLeidaAlumno(@Param('id') id: string) {
    return this.notificacionesService.marcarLeidaAlumno(+id);
  }

  // ── Profesor ──────────────────────────────────────────────────────

  @Get('profesor/:usuario_id/count')
  @Roles('admin', 'secretaria', 'profesor')
  countNoLeidasProfesor(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.countNoLeidasProfesor(+usuario_id);
  }

  @Get('profesor/:usuario_id')
  @Roles('admin', 'secretaria', 'profesor')
  findByProfesor(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.findByProfesor(+usuario_id);
  }

  @Put('profesor/:usuario_id/leer-todas')
  @Roles('admin', 'secretaria', 'profesor')
  marcarTodasLeidasProfesor(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.marcarTodasLeidasProfesor(+usuario_id);
  }

  @Put('profesor/notif/:id/leer')
  @Roles('admin', 'secretaria', 'profesor')
  marcarLeidaProfesor(@Param('id') id: string) {
    return this.notificacionesService.marcarLeidaProfesor(+id);
  }

  // ── Empleador ──────────────────────────────────────────────────────

  @Get('empleador/:usuario_id/count')
  @Roles('admin', 'secretaria', 'empleador')
  countNoLeidasEmpleador(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.countNoLeidasEmpleador(+usuario_id);
  }

  @Get('empleador/:usuario_id')
  @Roles('admin', 'secretaria', 'empleador')
  findByEmpleador(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.findByEmpleador(+usuario_id);
  }

  @Put('empleador/:usuario_id/leer-todas')
  @Roles('admin', 'secretaria', 'empleador')
  marcarTodasLeidasEmpleador(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.marcarTodasLeidasEmpleador(+usuario_id);
  }

  @Put('empleador/notif/:id/leer')
  @Roles('admin', 'secretaria', 'empleador')
  marcarLeidaEmpleador(@Param('id') id: string) {
    return this.notificacionesService.marcarLeidaEmpleador(+id);
  }
}

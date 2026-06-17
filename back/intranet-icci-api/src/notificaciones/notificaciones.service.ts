import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  // ── Seguimiento (admin / secretaria) ────────────────────────────

  async findAllSeguimiento() {
    const rows = await this.prisma.notificaciones.findMany({
      include: {
        alumno:    { select: { nombres: true, apellido1: true, apellido2: true, rut: true } },
        seguimiento: { select: { practica_num: true } },
      },
      orderBy: [{ leida: 'asc' }, { fecha_vencimiento: 'asc' }],
    });
    return rows.map(r => ({
      ...r,
      nombres:     r.alumno?.nombres,
      apellido1:   r.alumno?.apellido1,
      apellido2:   r.alumno?.apellido2,
      rut:         r.alumno?.rut,
      practica_num: r.seguimiento?.practica_num,
    }));
  }

  async countNoLeidasSeguimiento() {
    const total = await this.prisma.notificaciones.count({ where: { leida: 0 } });
    return { total };
  }

  async marcarLeidaSeguimiento(id: number) {
    return this.prisma.notificaciones.update({ where: { id }, data: { leida: 1 } });
  }

  async marcarTodasLeidasSeguimiento() {
    return this.prisma.notificaciones.updateMany({ where: { leida: 0 }, data: { leida: 1 } });
  }

  // ── Alumno ────────────────────────────────────────────────────────

  async findByAlumno(alumno_id: number) {
    return this.prisma.notificaciones_alumno.findMany({
      where: { alumno_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async countNoLeidasAlumno(alumno_id: number) {
    const total = await this.prisma.notificaciones_alumno.count({
      where: { alumno_id, leida: 0 },
    });
    return { total };
  }

  async marcarLeidaAlumno(id: number) {
    return this.prisma.notificaciones_alumno.update({ where: { id }, data: { leida: 1 } });
  }

  async marcarTodasLeidasAlumno(alumno_id: number) {
    return this.prisma.notificaciones_alumno.updateMany({
      where: { alumno_id, leida: 0 },
      data: { leida: 1 },
    });
  }

  async crearNotificacionAlumno(alumno_id: number, tipo: string, titulo: string, mensaje: string) {
    return this.prisma.$executeRawUnsafe(
      `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)`,
      alumno_id, tipo, titulo, mensaje,
    );
  }

  // ── Profesor ──────────────────────────────────────────────────────

  async findByProfesor(usuario_id: number) {
    return this.prisma.$queryRaw`
      SELECT
        np.id,
        np.tipo,
        np.titulo,
        np.mensaje,
        np.leida,
        np.created_at,
        np.seguimiento_id,
        a.nombres,
        a.apellido1,
        a.apellido2,
        a.rut,
        sp.informe_final,
        sp.practica_num
      FROM notificaciones_profesor np
      JOIN alumnos a  ON a.id  = np.alumno_id
      JOIN seguimiento_practica sp ON sp.id = np.seguimiento_id
      WHERE np.usuario_id = ${usuario_id}
      ORDER BY np.leida ASC, np.created_at DESC
    `;
  }

  async countNoLeidasProfesor(usuario_id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS total FROM notificaciones_profesor
      WHERE usuario_id = ${usuario_id} AND leida = 0
    `;
    return { total: Number(rows[0]?.total ?? 0) };
  }

  async marcarLeidaProfesor(id: number) {
    return this.prisma.$executeRaw`
      UPDATE notificaciones_profesor SET leida = 1 WHERE id = ${id}
    `;
  }

  async marcarTodasLeidasProfesor(usuario_id: number) {
    return this.prisma.$executeRaw`
      UPDATE notificaciones_profesor SET leida = 1 WHERE usuario_id = ${usuario_id}
    `;
  }

  // ── Empleador ──────────────────────────────────────────────────────

  async findByEmpleador(usuario_id: number) {
    return this.prisma.$queryRaw`
      SELECT
        ne.id,
        ne.tipo,
        ne.titulo,
        ne.mensaje,
        ne.leida,
        ne.created_at,
        ne.seguimiento_id,
        a.nombres,
        a.apellido1,
        a.apellido2,
        a.rut,
        sp.practica_num,
        sp.practica1_fecha_inicio,
        sp.practica1_fecha_termino,
        sp.practica1_horas_sem,
        sp.practica1_horas_tot,
        sp.practica1_supervisor,
        sp.practica1_jefe,
        e.nombre AS empresa_nombre,
        e.direccion AS empresa_direccion
      FROM notificaciones_empleador ne
      JOIN alumnos a ON a.id = ne.alumno_id
      JOIN seguimiento_practica sp ON sp.id = ne.seguimiento_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE ne.usuario_id = ${usuario_id}
      ORDER BY ne.leida ASC, ne.created_at DESC
    `;
  }

  async countNoLeidasEmpleador(usuario_id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS total FROM notificaciones_empleador
      WHERE usuario_id = ${usuario_id} AND leida = 0
    `;
    return { total: Number(rows[0]?.total ?? 0) };
  }

  async marcarLeidaEmpleador(id: number) {
    return this.prisma.$executeRaw`
      UPDATE notificaciones_empleador SET leida = 1 WHERE id = ${id}
    `;
  }

  async marcarTodasLeidasEmpleador(usuario_id: number) {
    return this.prisma.$executeRaw`
      UPDATE notificaciones_empleador SET leida = 1 WHERE usuario_id = ${usuario_id}
    `;
  }
}

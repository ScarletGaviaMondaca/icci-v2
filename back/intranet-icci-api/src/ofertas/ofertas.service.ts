import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OfertasService {
  constructor(private prisma: PrismaService) {}

  async findAll(empleadorId?: number, alumnoId?: number) {
    // Si se filtra por alumno, excluir ofertas donde ya postuló
    let excluirOfertas: number[] = [];
    if (alumnoId) {
      const posts = await this.prisma.postulaciones.findMany({
        where: { alumno_id: alumnoId, estado: { in: ['pendiente', 'aceptada'] } },
        select: { oferta_id: true },
      });
      excluirOfertas = posts.map(p => p.oferta_id);
    }

    const rows = await this.prisma.ofertas_practica.findMany({
      where: {
        activo: 1,
        ...(empleadorId ? { empleador_id: empleadorId } : {}),
        ...(excluirOfertas.length ? { id: { notIn: excluirOfertas } } : {}),
      },
      include: { empleador: { include: { empresa: { select: { nombre: true } } } } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(o => ({ ...o, empresa_nombre: o.empleador?.empresa?.nombre ?? '' }));
  }

  async verificarCandidato(alumno_id: number) {
    const alumno = await this.prisma.alumnos.findUnique({ where: { id: alumno_id } });
    if (!alumno || alumno.tipo !== 'regular') return { es_candidato: false, practica_num: null };

    const seg1 = await this.prisma.seguimiento_practica.findFirst({
      where: { alumno_id, practica_num: 1 },
    });

    // Sin seguimiento o práctica 1 no iniciada → candidato para práctica 1
    if (!seg1 || seg1.practica1_estado === 0) {
      return { es_candidato: true, practica_num: 1 };
    }
    // Práctica 1 en curso (aceptada) pero no terminada → no es candidato todavía
    if (seg1.estado_final_practica !== 2) {
      return { es_candidato: false, practica_num: null };
    }
    // Práctica 1 completada → verificar práctica 2
    const seg2 = await this.prisma.seguimiento_practica.findFirst({
      where: { alumno_id, practica_num: 2 },
    });
    if (!seg2 || seg2.practica1_estado === 0) {
      return { es_candidato: true, practica_num: 2 };
    }
    return { es_candidato: false, practica_num: null };
  }

  async todasPostulaciones() {
    const posts = await this.prisma.postulaciones.findMany({
      where: { estado: 'pendiente' },
      include: {
        alumno: { select: { nombres: true, apellido1: true, apellido2: true, rut: true } },
        oferta: {
          include: {
            empleador: { include: { empresa: { select: { nombre: true } } } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return posts.map(p => ({
      id:              p.id,
      oferta_id:       p.oferta_id,
      alumno_id:       p.alumno_id,
      practica_num:    p.practica_num,
      estado:          p.estado,
      created_at:      p.created_at,
      nombres:         p.alumno.nombres,
      apellido1:       p.alumno.apellido1,
      apellido2:       p.alumno.apellido2,
      rut:             p.alumno.rut,
      titulo:          p.oferta.titulo,
      conocimientos:   p.oferta.conocimientos,
      horas_semanales: p.oferta.horas_semanales,
      fecha_inicio:    p.oferta.fecha_inicio,
      nombre_supervisor: p.oferta.nombre_supervisor,
      empresa_nombre:  p.oferta.empleador?.empresa?.nombre ?? '',
    }));
  }

  async findOne(id: number) {
    const oferta = await this.prisma.ofertas_practica.findUnique({
      where: { id },
      include: {
        empleador: true,
        postulaciones: {
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
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    return oferta;
  }

  async create(data: any) {
    const parsed = { ...data };
    if (parsed.fecha_inicio && typeof parsed.fecha_inicio === 'string' && !parsed.fecha_inicio.includes('T')) {
      parsed.fecha_inicio = new Date(parsed.fecha_inicio + 'T00:00:00.000Z');
    }
    if (parsed.fecha_fin && typeof parsed.fecha_fin === 'string' && !parsed.fecha_fin.includes('T')) {
      parsed.fecha_fin = new Date(parsed.fecha_fin + 'T00:00:00.000Z');
    }
    return this.prisma.ofertas_practica.create({ data: parsed });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const parsed = { ...data };
    if (parsed.fecha_inicio && typeof parsed.fecha_inicio === 'string' && !parsed.fecha_inicio.includes('T')) {
      parsed.fecha_inicio = new Date(parsed.fecha_inicio + 'T00:00:00.000Z');
    }
    if (parsed.fecha_fin && typeof parsed.fecha_fin === 'string' && !parsed.fecha_fin.includes('T')) {
      parsed.fecha_fin = new Date(parsed.fecha_fin + 'T00:00:00.000Z');
    }
    return this.prisma.ofertas_practica.update({ where: { id }, data: parsed });
  }

  async toggleActivo(id: number) {
    const oferta = await this.findOne(id);
    return this.prisma.ofertas_practica.update({
      where: { id },
      data: { activo: oferta.activo === 1 ? 0 : 1 },
    });
  }

  async postular(oferta_id: number, alumno_id: number, practica_num: number) {
    return this.prisma.postulaciones.create({
      data: {
        oferta_id,
        alumno_id,
        practica_num,
        estado: 'pendiente',
      },
    });
  }

  async responderPostulacion(id: number, estado: string, motivo_rechazo?: string) {
    const postulacion = await this.prisma.postulaciones.findUnique({
      where: { id },
      include: {
        oferta: {
          include: { empleador: { include: { empresa: true } } },
        },
        alumno: { select: { id: true, plan: true } },
      },
    });
    if (!postulacion) throw new NotFoundException('Postulación no encontrada');

    await this.prisma.postulaciones.update({
      where: { id },
      data: { estado: estado as any, motivo_rechazo },
    });

    if (estado === 'aceptada') {
      const oferta        = postulacion.oferta;
      const alumno        = postulacion.alumno;
      const empleador     = oferta.empleador;
      const empresaNombre = empleador?.empresa?.nombre ?? null;
      const empresaId     = empleador?.empresa?.id ?? null;
      const fechaInicio   = oferta.fecha_inicio ? new Date(oferta.fecha_inicio) : null;

      const practicaNum = postulacion.practica_num ?? 1;

      // Horas totales reglamentarias por práctica
      const horasTot = practicaNum === 1 ? 180 : 320;

      // Fecha término estimada: inicio + ceil(horasTot / horasSem) semanas
      let fechaTermino: Date | null = null;
      if (fechaInicio && oferta.horas_semanales && oferta.horas_semanales > 0) {
        const semanas = Math.ceil(horasTot / oferta.horas_semanales);
        fechaTermino = new Date(fechaInicio);
        fechaTermino.setDate(fechaTermino.getDate() + semanas * 7);
      }

      // Datos del jefe (quien creó la cuenta del empleador)
      const jefeNombre = empleador
        ? `${empleador.nombres} ${empleador.apellido1}${empleador.apellido2 ? ' ' + empleador.apellido2 : ''}`.trim()
        : null;

      const seg = await this.prisma.seguimiento_practica.findFirst({
        where: { alumno_id: alumno.id, practica_num: practicaNum },
      });

      const hitoData: any = {
        practica1_estado:        1,
        practica1_fecha_inicio:  fechaInicio,
        practica1_fecha_termino: fechaTermino,
        practica1_empresa:       empresaNombre,
        practica1_horas_sem:     oferta.horas_semanales ?? null,
        practica1_horas_tot:     horasTot,
        practica1_supervisor:    oferta.nombre_supervisor ?? null,
        practica1_jefe:          jefeNombre,
        practica1_correo:        empleador?.correo ?? null,
        practica1_telefono:      empleador?.telefono ?? null,
        herramientas:            oferta.conocimientos ?? null,
        ...(empresaId ? { empresa_id: empresaId } : {}),
      };

      if (seg) {
        await this.prisma.seguimiento_practica.update({
          where: { id: seg.id },
          data: hitoData,
        });
      } else {
        await this.prisma.seguimiento_practica.create({
          data: {
            alumno_id:    alumno.id,
            plan:         alumno.plan ? String(alumno.plan) : '0',
            practica_num: practicaNum,
            ...hitoData,
          },
        });
      }

      // Notificación al alumno
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje) VALUES (?, 'postulacion_aceptada', '✅ Práctica aceptada', ?)`,
        alumno.id,
        `Tu postulación a "${oferta.titulo}" fue aceptada. Ya puedes iniciar tu práctica.`,
      );
    } else if (estado === 'rechazada') {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje) VALUES (?, 'postulacion_rechazada', '❌ Práctica no aceptada', ?)`,
        postulacion.alumno_id,
        motivo_rechazo
          ? `Tu postulación fue rechazada. Motivo: ${motivo_rechazo}`
          : `Tu postulación a "${postulacion.oferta.titulo}" fue rechazada.`,
      );
    }

    return { ok: true };
  }
}
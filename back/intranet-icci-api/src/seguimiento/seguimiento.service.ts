import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GeneradoresService } from '../generadores/generadores.service';
import { MailService, DestinatarioHito } from '../mail/mail.service';
import { Roles } from '../auth/decorators/roles.decorator';
import * as path from 'path';
import * as fs from 'fs';

// Estados de los hitos
const ESTADO = {
  NO_INICIADO: 0,
  PENDIENTE: 1,
  APROBADO: 2,
  EXCEDIDO: 3,
};

// Orden de los hitos
const HITOS = [
  'practica1_estado',
  'informe_elab_estado',
  'informe_rev_estado',
  'eval_empresa_estado',
  'comite_carrera_estado',
  'envioreg_estado',
];

const HITO_LABELS: Record<string, string> = {
  practica1_estado: 'Aprobación de la Práctica (Hito 1)',
  informe_elab_estado: 'Elaboración del Informe (Hito 2)',
  informe_rev_estado: 'Revisión del Informe (Hito 3)',
  eval_empresa_estado: 'Evaluación de la Empresa (Hito 4)',
  comite_carrera_estado: 'Comité de Carrera (Hito 5)',
  envioreg_estado: 'Envío de Registro (Hito 6)',
};

@Injectable()
export class SeguimientoService {
  constructor(
    private prisma: PrismaService,
    private generadoresSvc: GeneradoresService,
    private mailService: MailService,
  ) {}

  async findAll(practica_num: number = 1) {
    return this.prisma.$queryRaw`
      SELECT
        a.id AS id,
        a.rut,
        a.nombres,
        a.apellido1,
        a.apellido2,
        a.plan,
        sp.id AS seguimiento_id,
        sp.practica_num,
        COALESCE(sp.practica1_estado,0)      AS practica1_estado,
        COALESCE(sp.informe_elab_estado,0)   AS informe_elab_estado,
        COALESCE(sp.informe_rev_estado,0)    AS informe_rev_estado,
        COALESCE(sp.eval_empresa_estado,0)   AS eval_empresa_estado,
        COALESCE(sp.comite_carrera_estado,0) AS comite_carrera_estado,
        COALESCE(sp.envioreg_estado,0)       AS envioreg_estado,
        sp.estado_final_practica,
        sp.informe_final,
        sp.eval_empresa_archivo
      FROM alumnos a
      INNER JOIN seguimiento_practica sp ON sp.alumno_id = a.id
      WHERE sp.practica_num = ${practica_num}
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
  }

  // Alumnos con algún hito actualmente "cursando" (pendiente = 1)
  async getEnCurso() {
    return this.prisma.$queryRaw`
      SELECT
        a.id,
        a.rut,
        a.nombres,
        a.apellido1,
        a.apellido2,
        sp.practica_num,
        sp.practica1_empresa AS empresa_nombre,
        CASE
          WHEN sp.practica1_estado = 1      THEN 'practica1_estado'
          WHEN sp.informe_elab_estado = 1   THEN 'informe_elab_estado'
          WHEN sp.informe_rev_estado = 1    THEN 'informe_rev_estado'
          WHEN sp.eval_empresa_estado = 1   THEN 'eval_empresa_estado'
          WHEN sp.comite_carrera_estado = 1 THEN 'comite_carrera_estado'
          WHEN sp.envioreg_estado = 1       THEN 'envioreg_estado'
        END AS hito_actual,
        CASE
          WHEN sp.practica1_estado = 1      THEN sp.practica1_fecha_termino
          WHEN sp.informe_elab_estado = 1   THEN sp.informe_elab_fecha_termino
          WHEN sp.informe_rev_estado = 1    THEN sp.informe_rev_fecha_termino
          WHEN sp.eval_empresa_estado = 1   THEN sp.eval_empresa_fecha_termino
          WHEN sp.comite_carrera_estado = 1 THEN sp.comite_carrera_fecha_termino
          WHEN sp.envioreg_estado = 1       THEN sp.envioreg_fecha_termino
        END AS fecha_vencimiento
      FROM alumnos a
      INNER JOIN seguimiento_practica sp ON sp.alumno_id = a.id
      WHERE sp.practica1_estado = 1
         OR sp.informe_elab_estado = 1
         OR sp.informe_rev_estado = 1
         OR sp.eval_empresa_estado = 1
         OR sp.comite_carrera_estado = 1
         OR sp.envioreg_estado = 1
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
  }

  private async notificarSecretaria(alumno_id: number, seguimiento_id: number, hito: string, hito_label: string) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO notificaciones (alumno_id, seguimiento_id, hito, hito_label, fecha_vencimiento)
       SELECT ?, ?, ?, ?, CURDATE()
       WHERE NOT EXISTS (
         SELECT 1 FROM notificaciones
         WHERE alumno_id = ? AND seguimiento_id = ? AND hito = ? AND leida = 0
       )`,
      alumno_id, seguimiento_id, hito, hito_label,
      alumno_id, seguimiento_id, hito,
    );
  }

  private async checkPracticaProxima(alumno_id: number, practica_num: number, seg: any) {
    if (!seg || Number(seg.practica1_estado) !== 1) return;
    const fechaTermino = seg.practica1_fecha_termino ? new Date(seg.practica1_fecha_termino) : null;
    if (!fechaTermino) return;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const termino = new Date(fechaTermino); termino.setHours(0, 0, 0, 0);
    if (termino <= hoy) return;

    const diasRestantes = Math.ceil((termino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes > 7) return;

    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM notificaciones_alumno
      WHERE alumno_id = ${alumno_id}
        AND tipo = 'informe_recordatorio'
        AND titulo = '⏳ Tu práctica está por terminar'
      LIMIT 1
    `;
    if (existing.length === 0) {
      const fechaStr = termino.toISOString().split('T')[0];
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
         VALUES (?, 'informe_recordatorio', '⏳ Tu práctica está por terminar', ?)`,
        alumno_id,
        `Tu práctica termina el ${fechaStr} (en ${diasRestantes} día(s)). Prepárate para comenzar la elaboración de tu informe de práctica.`,
      );
    }
  }

  private async checkInformeDeadline(alumno_id: number, practica_num: number, seg: any) {
    if (!seg || Number(seg.informe_elab_estado) !== 1) return;
    const fechaTermino = seg.informe_elab_fecha_termino ? new Date(seg.informe_elab_fecha_termino) : null;
    if (!fechaTermino) return;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const termino = new Date(fechaTermino); termino.setHours(0, 0, 0, 0);

    if (termino < hoy) {
      const tieneInforme = !!seg.informe_final;
      const nuevoEstado = tieneInforme ? 2 : 3;
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET informe_elab_estado = ? WHERE alumno_id = ? AND practica_num = ?`,
        nuevoEstado, alumno_id, practica_num
      );
      if (tieneInforme) {
        await this.activarSiguienteHito(Number(seg.seguimiento_id), practica_num, 'informe_elab_estado');
      } else {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
           SELECT ?, 'hito_excedido', '❌ Informe no entregado a tiempo',
                  'El plazo de elaboración del informe venció sin entrega. El hito fue marcado como reprobado.'
           WHERE NOT EXISTS (
             SELECT 1 FROM notificaciones_alumno
             WHERE alumno_id = ? AND tipo = 'hito_excedido'
               AND mensaje LIKE '%plazo de elaboración%'
           )`,
          alumno_id, alumno_id
        );
        await this.notificarHitoExcedido(Number(seg.seguimiento_id), 'informe_elab_estado');
      }
      return;
    }

    const diasRestantes = Math.ceil((termino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 5) {
      const existing = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM notificaciones_alumno
        WHERE alumno_id = ${alumno_id}
          AND tipo = 'informe_recordatorio'
          AND titulo = '⏰ Recuerda subir tu informe'
        LIMIT 1
      `;
      if (existing.length === 0) {
        const fechaStr = termino.toISOString().split('T')[0];
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
           VALUES (?, 'informe_recordatorio', '⏰ Recuerda subir tu informe', ?)`,
          alumno_id,
          `Tienes ${diasRestantes} día(s) para subir tu informe antes del ${fechaStr}. No olvides subirlo a tiempo.`
        );
      }
    }
  }

  // Resuelve los correos de alumno, empresa (vía la postulación aceptada del
  // alumno para esa práctica), jefe de carrera y director de departamento
  // (ambos "efectivos": subrogante activo si existe, si no el titular) para
  // avisarles que un hito de una práctica venció. Si no hay postulación
  // aceptada asociada, simplemente no se agrega destinatario de empresa.
  private async resolverDestinatariosHitoExcedido(seguimientoId: number): Promise<{
    alumnoNombre: string;
    practicaNum: number;
    destinatarios: DestinatarioHito[];
  } | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT sp.alumno_id, sp.practica_num, a.nombres, a.apellido1, a.apellido2,
             COALESCE(a.correo_institucional, a.correo_personal) AS alumno_correo
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      WHERE sp.id = ${seguimientoId}
      LIMIT 1
    `;
    const seg = rows[0];
    if (!seg) return null;

    const destinatarios: DestinatarioHito[] = [];

    if (seg.alumno_correo) {
      destinatarios.push({ correo: seg.alumno_correo, rol: 'alumno' });
    }

    const empresaRows = await this.prisma.$queryRaw<any[]>`
      SELECT em.correo
      FROM postulaciones p
      JOIN ofertas_practica o ON o.id = p.oferta_id
      JOIN empleadores em ON em.id = o.empleador_id
      WHERE p.alumno_id = ${seg.alumno_id} AND p.practica_num = ${seg.practica_num} AND p.estado = 'aceptada'
      ORDER BY p.created_at DESC
      LIMIT 1
    `;
    if (empresaRows[0]?.correo) {
      destinatarios.push({ correo: empresaRows[0].correo, rol: 'empresa' });
    }

    const [jefe, director] = await Promise.all([
      this.generadoresSvc.getJefeCarreraEfectivo(),
      this.generadoresSvc.getDirectorDepartamentoEfectivo(),
    ]);
    if (jefe?.correo) destinatarios.push({ correo: jefe.correo, rol: 'jefe_carrera' });
    if (director?.correo) destinatarios.push({ correo: director.correo, rol: 'director_departamento' });

    return {
      alumnoNombre: `${seg.nombres} ${seg.apellido1}${seg.apellido2 ? ' ' + seg.apellido2 : ''}`.trim(),
      practicaNum: Number(seg.practica_num),
      destinatarios,
    };
  }

  // Punto único de aviso por correo cuando un hito queda EXCEDIDO — sin
  // importar si lo detectó un cron automático o lo marcó alguien manualmente.
  // Best-effort: nunca debe interrumpir el flujo que la llama.
  private async notificarHitoExcedido(seguimientoId: number, hito: string) {
    try {
      const info = await this.resolverDestinatariosHitoExcedido(seguimientoId);
      if (!info || info.destinatarios.length === 0) return;
      await this.mailService.enviarHitoExcedido(info.destinatarios, {
        alumnoNombre: info.alumnoNombre,
        hitoLabel: HITO_LABELS[hito] ?? hito,
        practicaNum: info.practicaNum,
      });
    } catch (e) {
      console.error('[notificarHitoExcedido] Error:', e);
    }
  }

  // Cron diario: escala a secretaría los informes que llevan 2 meses vencidos
  // (el plazo normal de elaboración del informe, configurado en hito_duraciones,
  // ya venció y el alumno sigue sin subirlo). Cubre tanto al alumno que nunca
  // volvió a abrir su seguimiento (informe_elab_estado quedó en 1/PENDIENTE)
  // como al que sí lo hizo y checkInformeDeadline ya lo marcó 3/EXCEDIDO.
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async revisarInformesAtrasados() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT sp.id AS seguimiento_id, sp.alumno_id,
             a.nombres, a.apellido1, a.apellido2
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      WHERE sp.informe_elab_estado IN (1, 3)
        AND sp.informe_final IS NULL
        AND COALESCE(sp.informe_atrasado, 0) = 0
        AND sp.informe_elab_fecha_termino IS NOT NULL
        AND sp.informe_elab_fecha_termino <= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
    `;

    for (const r of rows) {
      const seguimientoId = Number(r.seguimiento_id);
      const alumnoId = Number(r.alumno_id);
      const nombreAlumno = `${r.nombres} ${r.apellido1}${r.apellido2 ? ' ' + r.apellido2 : ''}`.trim();

      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET informe_atrasado = 1 WHERE id = ?`,
        seguimientoId,
      );

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
         VALUES (?, 'informe_atrasado', '🚨 Informe muy atrasado', ?)`,
        alumnoId,
        'Han pasado más de 2 meses desde el vencimiento del plazo para entregar tu informe de práctica y aún no lo has subido. Contacta a la secretaría a la brevedad.',
      );

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones (alumno_id, seguimiento_id, hito, hito_label, fecha_vencimiento)
         VALUES (?, ?, 'informe_atrasado', ?, CURDATE())`,
        alumnoId, seguimientoId,
        `🚨 Informe atrasado (2+ meses): ${nombreAlumno}`.slice(0, 100),
      );
    }
  }

  // Cron diario: escala a secretaría/jefe de carrera las prácticas cuyo hito 1
  // (practica1_estado) lleva 2 meses vencido sin haber sido aprobado por el
  // Jefe de Carrera. Cubre tanto al alumno que quedó atascado en PENDIENTE
  // como al que ya fue marcado EXCEDIDO manualmente vía :id/exceder/:hito.
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async revisarPracticasAtrasadas() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT sp.id AS seguimiento_id, sp.alumno_id,
             a.nombres, a.apellido1, a.apellido2
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      WHERE sp.practica1_estado IN (1, 3)
        AND COALESCE(sp.practica1_atrasada, 0) = 0
        AND sp.practica1_fecha_termino IS NOT NULL
        AND sp.practica1_fecha_termino <= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
    `;

    for (const r of rows) {
      const seguimientoId = Number(r.seguimiento_id);
      const alumnoId = Number(r.alumno_id);
      const nombreAlumno = `${r.nombres} ${r.apellido1}${r.apellido2 ? ' ' + r.apellido2 : ''}`.trim();

      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET practica1_atrasada = 1 WHERE id = ?`,
        seguimientoId,
      );

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
         VALUES (?, 'informe_atrasado', '🚨 Práctica sin aprobar', ?)`,
        alumnoId,
        'Han pasado más de 2 meses desde el término de tu práctica y el Jefe de Carrera aún no la aprueba. Contacta a la secretaría a la brevedad.',
      );

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones (alumno_id, seguimiento_id, hito, hito_label, fecha_vencimiento)
         VALUES (?, ?, 'practica1_atrasada', ?, CURDATE())`,
        alumnoId, seguimientoId,
        `🚨 Práctica atrasada (2+ meses): ${nombreAlumno}`.slice(0, 100),
      );
    }
  }

  // Cron diario: marca automáticamente como EXCEDIDO cualquier hito cuyo plazo
  // (fecha_termino) ya pasó y que sigue en PENDIENTE, y avisa por correo.
  // No incluye informe_elab_estado (ya tiene su propio chequeo on-demand en
  // checkInformeDeadline, con la lógica extra de revisar si ya hay informe
  // subido) ni informe_rev_estado en su rama de rechazo manual por el profesor
  // (evento distinto a un vencimiento de plazo, con su propio aviso).
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async revisarHitosVencidos() {
    const hitosAutoDetectables = [
      'practica1_estado',
      'informe_rev_estado',
      'eval_empresa_estado',
      'comite_carrera_estado',
      'envioreg_estado',
    ];

    for (const hito of hitosAutoDetectables) {
      const columnaFecha = `${hito.replace(/_estado$/, '')}_fecha_termino`;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM seguimiento_practica
         WHERE \`${hito}\` = 1
           AND \`${columnaFecha}\` IS NOT NULL
           AND \`${columnaFecha}\` < CURDATE()`,
      );

      for (const r of rows) {
        const seguimientoId = Number(r.id);
        await this.prisma.$executeRawUnsafe(
          `UPDATE seguimiento_practica SET \`${hito}\` = 3 WHERE id = ?`,
          seguimientoId,
        );
        await this.notificarHitoExcedido(seguimientoId, hito);
      }
    }
  }

  async findByAlumno(alumno_id: number, practica_num: number = 1) {
    const rows = await this.prisma.$queryRaw`
      SELECT
        a.id AS alumno_id,
        a.rut,
        a.nombres,
        a.apellido1,
        a.apellido2,
        a.plan,
        sp.id AS seguimiento_id,
        sp.practica_num,
        COALESCE(sp.practica1_estado,0)      AS practica1_estado,
        COALESCE(sp.informe_elab_estado,0)   AS informe_elab_estado,
        COALESCE(sp.informe_rev_estado,0)    AS informe_rev_estado,
        COALESCE(sp.eval_empresa_estado,0)   AS eval_empresa_estado,
        COALESCE(sp.comite_carrera_estado,0) AS comite_carrera_estado,
        COALESCE(sp.envioreg_estado,0)       AS envioreg_estado,
        sp.practica1_fecha_inicio,
        sp.practica1_fecha_termino,
        sp.practica1_empresa,
        sp.practica1_horas_sem,
        sp.practica1_horas_tot,
        sp.practica1_supervisor,
        sp.empresa_id,
        sp.practica1_jefe,
        sp.practica1_correo,
        sp.practica1_telefono,
        sp.numero_carta,
        sp.informe_elab_fecha_inicio,
        sp.informe_elab_fecha_termino,
        sp.informe_rev_fecha_inicio,
        sp.informe_rev_fecha_termino,
        sp.eval_empresa_fecha_inicio,
        sp.eval_empresa_fecha_termino,
        sp.comite_carrera_fecha_inicio,
        sp.comite_carrera_fecha_termino,
        sp.envioreg_fecha_inicio,
        sp.envioreg_fecha_termino,
        sp.estado_final_practica,
        sp.informe_final,
        sp.eval_empresa_archivo,
        sp.informe_rev_profesor_id,
        sp.informe_rev_carta_peticion,
        sp.informe_rev_carta_asignacion,
        sp.informe_fecha_subida,
        sp.herramientas,
        sp.practica_semestre_aprobacion,
        sp.practica_anio_aprobacion,
        sp.acta_firmada,
        sp.informe_elab_fecha_entrega,
        sp.informe_rev_fecha_entrega,
        sp.eval_empresa_fecha_entrega,
        sp.comite_carrera_fecha_entrega,
        sp.envioreg_fecha_entrega,
        sp.carta_solicitud,
        sp.informe_rev_formulario,
        sp.practica1_fecha_aprobacion,
        sp.informe_elab_fecha_aprobacion,
        sp.informe_rev_fecha_aprobacion,
        sp.eval_empresa_fecha_aprobacion,
        sp.comite_carrera_fecha_aprobacion,
        sp.envioreg_fecha_aprobacion,
        sp.envioreg_fecha_envio,
        CONCAT(pr.nombre, ' ', pr.apellido1) AS profesor_nombre
      FROM alumnos a
      LEFT JOIN seguimiento_practica sp ON sp.alumno_id = a.id
        AND sp.practica_num = ${practica_num}
      LEFT JOIN profesores pr ON pr.id = sp.informe_rev_profesor_id
      WHERE a.id = ${alumno_id}
      ORDER BY a.apellido1, a.apellido2, a.nombres
    ` as any[];
    const seg = Array.isArray(rows) ? rows[0] : null;
    if (seg?.seguimiento_id) {
      await this.checkPracticaProxima(alumno_id, practica_num, seg).catch(() => {});
      await this.checkInformeDeadline(alumno_id, practica_num, seg).catch(() => {});
    }
    return rows;
  }

  // Al aprobarse un hito, activa el siguiente ("en proceso") y calcula sus fechas
  // de inicio/término según la duración configurada en hito_duraciones (por hito y práctica).
  private async activarSiguienteHito(seguimientoId: number, practicaNum: number, hitoActual: string) {
    const idx = HITOS.indexOf(hitoActual);
    if (idx < 0 || idx === HITOS.length - 1) return; // no hay hito siguiente

    const siguiente = HITOS[idx + 1];
    const hitoNumSiguiente = idx + 2; // HITOS[0] = hito_num 1

    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET \`${siguiente}\` = ${ESTADO.PENDIENTE}
       WHERE id = ? AND COALESCE(\`${siguiente}\`, 0) = ${ESTADO.NO_INICIADO}`,
      seguimientoId,
    );

    const duracion = await this.prisma.hito_duraciones.findUnique({
      where: { hito_num_practica_num: { hito_num: hitoNumSiguiente, practica_num: practicaNum } },
    });
    const dias = duracion?.duracion_dias;
    if (!dias) return; // hito medido en horas u otro caso sin duración en días

    const fechaInicio  = siguiente.replace('_estado', '_fecha_inicio');
    const fechaTermino = siguiente.replace('_estado', '_fecha_termino');

    const hoy     = new Date();
    const inicio  = new Date(hoy); inicio.setDate(hoy.getDate() + 1);
    const termino = new Date(inicio); termino.setDate(inicio.getDate() + dias);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica
       SET \`${fechaInicio}\`  = COALESCE(\`${fechaInicio}\`,  ?),
           \`${fechaTermino}\` = COALESCE(\`${fechaTermino}\`, ?)
       WHERE id = ?`,
      fmt(inicio), fmt(termino), seguimientoId,
    );
  }

  private async recomputarEstadoFinalPractica(alumno_id: number, practica_num: number) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET estado_final_practica =
        CASE
          WHEN practica1_estado=3 OR informe_elab_estado=3 OR informe_rev_estado=3
            OR eval_empresa_estado=3 OR comite_carrera_estado=3 OR envioreg_estado=3 THEN 3
          WHEN practica1_estado=2 AND informe_elab_estado=2 AND informe_rev_estado=2
            AND eval_empresa_estado=2 AND comite_carrera_estado=2 AND envioreg_estado=2 THEN 2
          WHEN practica1_estado>0 OR informe_elab_estado>0 OR informe_rev_estado>0
            OR eval_empresa_estado>0 OR comite_carrera_estado>0 OR envioreg_estado>0 THEN 1
          ELSE 0
        END
      WHERE alumno_id = ? AND practica_num = ?`,
      alumno_id, practica_num
    );
    await this.generarCertificadoSiQuedoAprobada(alumno_id, practica_num);
  }

  // Si la práctica quedó completamente aprobada (los 6 hitos en 2), genera el
  // certificado automáticamente -sin bloquear la aprobación del hito si falla-.
  private async generarCertificadoSiQuedoAprobada(alumno_id: number, practica_num: number) {
    try {
      const seg = await this.prisma.seguimiento_practica.findFirst({
        where: { alumno_id, practica_num },
        select: { estado_final_practica: true },
      });
      if (seg?.estado_final_practica !== 2) return;

      const alumno = await this.prisma.alumnos.findUnique({ where: { id: alumno_id }, select: { rut: true } });
      if (!alumno?.rut) return;

      await this.generadoresSvc.generarCertificadoSiFalta(alumno.rut, practica_num, 'sistema');
    } catch (e) {
      console.error('[generarCertificadoSiQuedoAprobada] Error al generar certificado:', e);
    }
  }

  async updateCampo(payload: { alumno_id: number; plan: string; practica_num: number; campo: string; valor: any }) {
    const { alumno_id, plan, practica_num, campo, valor } = payload;

    const permitidos = [
      'practica1_estado', 'informe_elab_estado', 'informe_rev_estado',
      'eval_empresa_estado', 'comite_carrera_estado', 'envioreg_estado',
      'practica1_fecha_inicio', 'practica1_fecha_termino', 'practica1_empresa',
      'practica1_horas_sem', 'practica1_horas_tot', 'practica1_supervisor',
      'numero_carta', 'estado_final_practica', 'informe_final',
      'informe_elab_fecha_inicio', 'informe_elab_fecha_termino',
      'informe_rev_fecha_inicio', 'informe_rev_fecha_termino',
      'eval_empresa_fecha_inicio', 'eval_empresa_fecha_termino',
      'comite_carrera_fecha_inicio', 'comite_carrera_fecha_termino',
      'envioreg_fecha_inicio', 'envioreg_fecha_termino',
      'eval_empresa_archivo', 'informe_rev_profesor_id',
      'informe_rev_carta_peticion', 'informe_rev_carta_asignacion',
      'informe_fecha_subida', 'empresa_id', 'practica1_jefe',
      'envioreg_fecha_envio', 'practica_anio_aprobacion', 'practica_semestre_aprobacion',
      'practica1_correo', 'practica1_telefono', 'herramientas',
      'informe_elab_fecha_entrega', 'informe_rev_fecha_entrega',
      'eval_empresa_fecha_entrega', 'comite_carrera_fecha_entrega',
      'envioreg_fecha_entrega', 'carta_solicitud',
    ];

    if (!permitidos.includes(campo)) {
      throw new BadRequestException('Campo no permitido');
    }

    // Crear registro solo si no existe ya uno para este alumno + practica_num
    await this.prisma.$executeRaw`
      INSERT INTO seguimiento_practica (alumno_id, plan, practica_num)
      SELECT ${alumno_id}, ${plan}, ${practica_num}
      WHERE NOT EXISTS (
        SELECT 1 FROM seguimiento_practica
        WHERE alumno_id = ${alumno_id} AND practica_num = ${practica_num}
      )
    `;
    // UPDATE campo dinámico
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET \`${campo}\` = ?, updated_at = CURRENT_TIMESTAMP
      WHERE alumno_id = ? AND practica_num = ?`,
      valor, alumno_id, practica_num
    );
    // Si se guarda una fecha_inicio de un hito que está en 0, activarlo a pendiente (1)
    const fechaInicioAEstado: Record<string, string> = {
      'informe_elab_fecha_inicio':   'informe_elab_estado',
      'informe_rev_fecha_inicio':    'informe_rev_estado',
      'eval_empresa_fecha_inicio':   'eval_empresa_estado',
      'comite_carrera_fecha_inicio': 'comite_carrera_estado',
      'envioreg_fecha_inicio':       'envioreg_estado',
    };
    if (fechaInicioAEstado[campo] && valor) {
      const estadoHito = fechaInicioAEstado[campo];
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET \`${estadoHito}\` = 1
         WHERE alumno_id = ? AND practica_num = ?
         AND COALESCE(\`${estadoHito}\`, 0) = 0`,
        alumno_id, practica_num
      );
    }

    // Si se aprueba un hito (valor = 2), avanzar el siguiente a pendiente y calcular sus fechas
    if (campo.includes('_estado') && Number(valor) === 2) {
      const fmtDate = (d: Date) => d.toISOString().split('T')[0];
      const hoy     = new Date();

      // Marcar fecha_termino del hito actual como hoy (solo si aún no está seteada)
      const terminoActual = campo.replace('_estado', '_fecha_termino');
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET \`${terminoActual}\` = COALESCE(\`${terminoActual}\`, ?)
         WHERE alumno_id = ? AND practica_num = ?`,
        fmtDate(hoy), alumno_id, practica_num
      );

      const seg = await this.prisma.seguimiento_practica.findFirst({
        where: { alumno_id, practica_num },
        select: { id: true },
      });
      if (seg) await this.activarSiguienteHito(seg.id, practica_num, campo);

      const campoAprobacion: Record<string, string> = {
        'practica1_estado':      'practica1_fecha_aprobacion',
        'informe_elab_estado':   'informe_elab_fecha_aprobacion',
        'informe_rev_estado':    'informe_rev_fecha_aprobacion',
        'eval_empresa_estado':   'eval_empresa_fecha_aprobacion',
        'comite_carrera_estado': 'comite_carrera_fecha_aprobacion',
        'envioreg_estado':       'envioreg_fecha_aprobacion',
      };

      if (campoAprobacion[campo]) {
        const hoy = new Date().toISOString().split('T')[0];
        await this.prisma.$executeRawUnsafe(
          `UPDATE seguimiento_practica SET \`${campoAprobacion[campo]}\` = ?
          WHERE alumno_id = ? AND practica_num = ?`,
          hoy, alumno_id, practica_num
        );
      }
      // Actualizar estado_final_practica automáticamente
      await this.recomputarEstadoFinalPractica(alumno_id, practica_num);
      // Insertar notificación al alumno según el nuevo estado
      const hitoLabels: Record<string, string> = {
        'practica1_estado':      'Estudiante en Práctica',
        'informe_elab_estado':   'Elaboración del Informe',
        'informe_rev_estado':    'Revisión del Informe',
        'eval_empresa_estado':   'Evaluación Empresa',
        'comite_carrera_estado': 'Comité de Carrera',
        'envioreg_estado':       'Envío a Registraduría',
      };
      if (hitoLabels[campo] && (valor === 2 || valor === 3)) {
        const tipo    = valor === 2 ? 'hito_aprobado' : 'hito_excedido';
        const esPractica = campo === 'practica1_estado';
        const titulo  = valor === 2
          ? (esPractica ? '📝 Práctica aprobada — inicia tu informe' : '✅ Hito aprobado')
          : '❌ Hito no aprobado';
        const mensaje = valor === 2
          ? (esPractica
              ? 'Tu práctica profesional fue aprobada. Ya puedes comenzar la elaboración de tu informe dentro de los plazos indicados en tu seguimiento.'
              : `Tu hito "${hitoLabels[campo]}" fue aprobado. ¡Sigue adelante!`)
          : `Tu hito "${hitoLabels[campo]}" fue marcado como reprobado/excedido.`;
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)`,
          alumno_id, tipo, titulo, mensaje,
        );
      }
    } else if (campo.includes('_estado') && Number(valor) === 3) {
      // Hito rechazado/excedido: no se activa el siguiente hito, pero igual debe
      // reflejarse en el estado final de la práctica.
      await this.recomputarEstadoFinalPractica(alumno_id, practica_num);
    }
    return { ok: true, campo, valor };
  }

  async getInformes(rut?: string, anio?: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT
        a.rut,
        a.nombres                  AS nombre,
        a.apellido1,
        a.apellido2,
        sp.practica_num,
        sp.informe_final           AS informe,
        sp.eval_empresa_archivo    AS evaluacion,
        sp.acta_firmada            AS acta,
        sp.practica_anio_aprobacion AS anio_aprobacion
      FROM alumnos a
      INNER JOIN seguimiento_practica sp ON sp.alumno_id = a.id
      WHERE sp.estado_final_practica = 2
        AND (${rut || ''} = '' OR a.rut LIKE ${rut ? `%${rut}%` : '%'})
        AND (${anio || ''} = '' OR sp.practica_anio_aprobacion = ${anio ? parseInt(anio) : 0})
      ORDER BY a.apellido1, a.apellido2, a.nombres, sp.practica_num
    `;
    const practica1 = (rows as any[]).filter(r => Number(r.practica_num) === 1);
    const practica2 = (rows as any[]).filter(r => Number(r.practica_num) === 2);
    return { practica1, practica2 };
  }

  async verificarDocumento(codigo: string) {
    const crypto = require('crypto');
    const codigoLimpio = codigo.replace(/-/g, '').toUpperCase();

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT sp.id, sp.practica_num, sp.eval_empresa_archivo, sp.informe_rev_formulario,
             sp.practica1_fecha_inicio, sp.practica1_fecha_termino,
             al.rut, al.nombres, al.apellido1,
             COALESCE(e.nombre, sp.practica1_empresa) AS empresa_nombre
      FROM seguimiento_practica sp
      JOIN alumnos al ON al.id = sp.alumno_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
    `;

    for (const row of rows) {
      const id          = Number(row.id);
      const practica_num = Number(row.practica_num);
      const rut         = row.rut;
      const alumno      = `${row.nombres} ${row.apellido1}`;

      // Informe confidencial
      const semillaConf = `inf_conf_${id}_${rut}_${practica_num}`;
      const hashConf    = crypto.createHash('md5').update(semillaConf).digest('hex').substring(0, 12).toUpperCase();
      if (hashConf === codigoLimpio) {
        return {
          valido: true,
          tipo: 'informe_confidencial',
          nombre: 'Informe Confidencial de Práctica',
          alumno_nombre: alumno,
          alumno_rut: rut,
          empresa: row.empresa_nombre ?? '—',
          practica_num,
          fecha_inicio:  row.practica1_fecha_inicio ?? null,
          fecha_termino: row.practica1_fecha_termino ?? null,
          pdf_url: row.eval_empresa_archivo ?? null,
        };
      }

      // Formulario de revisión
      const semillaForm = `${id}${rut}${practica_num}`;
      const hashForm    = crypto.createHash('md5').update(semillaForm).digest('hex').substring(0, 12).toUpperCase();
      if (hashForm === codigoLimpio) {
        return {
          valido: true,
          tipo: 'formulario_revision',
          nombre: 'Formulario de Revisión del Informe',
          alumno_nombre: alumno,
          alumno_rut: rut,
          empresa: row.empresa_nombre ?? '—',
          practica_num,
          fecha_inicio:  row.practica1_fecha_inicio ?? null,
          fecha_termino: row.practica1_fecha_termino ?? null,
          pdf_url: row.informe_rev_formulario ?? null,
        };
      }
    }

    // Solicitud de profesor evaluador (código persistido, agrupa varios alumnos)
    const solicitud = await this.prisma.solicitudes_profesor_evaluador.findUnique({
      where: { codigo: codigoLimpio },
    });
    if (solicitud) {
      return {
        valido: true,
        tipo: 'solicitud_profesor_evaluador',
        nombre: 'Solicitud de Profesor Evaluador',
        alumno_nombre: solicitud.alumnos_resumen,
        alumno_rut: '—',
        empresa: solicitud.empresas_resumen ?? '—',
        fecha_emision: solicitud.created_at,
        creado_por: solicitud.creado_por,
        pdf_url: solicitud.ruta_archivo ?? null,
      };
    }

    // Acta de designación de académico evaluador (DICI → jefe de carrera)
    const acta = await this.prisma.actas_academico_evaluador.findUnique({
      where: { codigo: codigoLimpio },
    });
    if (acta) {
      return {
        valido: true,
        tipo: 'acta_academico_evaluador',
        nombre: 'Acta de Designación de Académico Evaluador',
        alumno_nombre: acta.alumnos_resumen,
        alumno_rut: '—',
        fecha_emision: acta.created_at,
        creado_por: acta.creado_por,
        pdf_url: acta.ruta_archivo ?? null,
      };
    }

    return { valido: false, mensaje: 'El código no corresponde a ningún documento registrado.' };
  }

  async verificarCertificado(codigo: string) {
    const crypto = require('crypto');
    const codigoLimpio = codigo.replace(/-/g, '');

    // Certificados de práctica (código calculado, igual lógica que generarCertificado)
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT a.id AS alumno_id, a.rut, a.nombres, a.apellido1,
             sp.practica_num, sp.practica1_fecha_inicio, sp.practica1_fecha_termino,
             sp.practica1_horas_tot,
             COALESCE(e.nombre, sp.practica1_empresa) AS empresa_nombre
      FROM alumnos a
      INNER JOIN seguimiento_practica sp ON sp.alumno_id = a.id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE sp.estado_final_practica = 2
    `;

    for (const row of rows) {
      const alumnoId      = Number(row.alumno_id);
      const practica_num  = Number(row.practica_num);
      const rutDigits     = String(row.rut).replace(/[^0-9]/g, '');
      const semilla       = `${alumnoId}${practica_num}${rutDigits}`;
      const hashHex       = crypto.createHash('md5').update(semilla).digest('hex');
      const crcNum        = Math.abs(parseInt(hashHex.substring(0, 8), 16)) % 1000000000;
      const codigoGen     = String(crcNum).padStart(9, '0');

      if (codigoGen === codigoLimpio) {
        const cert = await this.prisma.certificados.findFirst({
          where: { alumno_rut: row.rut, practica_num },
          orderBy: { id: 'desc' },
        });
        return {
          valido: true,
          tipo: 'practica',
          nombre: 'Certificado de Práctica Profesional',
          alumno_nombre: `${row.nombres} ${row.apellido1}`,
          alumno_rut: row.rut,
          empresa: row.empresa_nombre ?? '—',
          practica_num,
          fecha_inicio:  row.practica1_fecha_inicio ?? null,
          fecha_termino: row.practica1_fecha_termino ?? null,
          horas_totales: row.practica1_horas_tot ?? null,
          fecha_emision: cert?.fecha_creacion ?? null,
          pdf_url: cert?.ruta_archivo ?? null,
        };
      }
    }

    // Certificados externos (código almacenado directamente al subirlos)
    const externo = await this.prisma.certificados_externos.findFirst({
      where: { codigo: codigoLimpio },
    });
    if (externo) {
      const alumno = await this.prisma.alumnos.findUnique({
        where: { id: externo.alumno_id },
        select: { nombres: true, apellido1: true, apellido2: true },
      });
      return {
        valido: true,
        tipo: 'certificado_externo',
        nombre: externo.nombre,
        alumno_nombre: alumno
          ? `${alumno.nombres} ${alumno.apellido1} ${alumno.apellido2 ?? ''}`.trim()
          : '—',
        alumno_rut: externo.alumno_rut,
        fecha_emision: externo.fecha_emision,
        pdf_url: externo.ruta_final,
      };
    }

    return { valido: false, mensaje: 'El código no corresponde a ningún certificado registrado.' };
  }

  async getAniosAprobacion() {
    const rows = await this.prisma.$queryRaw`
      SELECT DISTINCT practica_anio_aprobacion AS anio
      FROM seguimiento_practica
      WHERE practica_anio_aprobacion IS NOT NULL
        AND estado_final_practica = 2
      ORDER BY anio DESC
    `;
    return (rows as any[]).map(r => Number(r.anio));
  }

  async getAprobados() {
    const rows = await this.prisma.$queryRaw`
      SELECT
        a.id                                                         AS alumno_id,
        a.rut,
        CONCAT(a.nombres, ' ', a.apellido1,
               IFNULL(CONCAT(' ', a.apellido2), ''))                AS alumno_nombre,
        a.nombres,
        CONCAT(a.apellido1, IFNULL(CONCAT(' ', a.apellido2), ''))  AS apellidos,
        sp.practica_num,
        COALESCE(e.nombre, sp.practica1_empresa)                   AS empresa,
        sp.practica1_fecha_inicio                                   AS fecha_inicio,
        sp.practica1_fecha_termino                                  AS fecha_termino,
        COALESCE(sp.practica1_horas_tot, 0)                        AS horas_totales,
        COALESCE(sp.estado_final_practica, 0)                      AS estado_final,
        sp.herramientas
      FROM alumnos a
      INNER JOIN seguimiento_practica sp ON sp.alumno_id = a.id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE sp.estado_final_practica = 2
      ORDER BY a.apellido1, a.apellido2, a.nombres, sp.practica_num
    `;
    return (rows as any[]).map(r => ({
      alumno_id:      Number(r.alumno_id),
      rut:            r.rut,
      alumno_nombre:  r.alumno_nombre,
      nombres:        r.nombres,
      apellidos:      r.apellidos,
      practica_num:   Number(r.practica_num),
      empresa:        r.empresa ?? '—',
      fecha_inicio:   r.fecha_inicio,
      fecha_termino:  r.fecha_termino,
      horas_totales:  Number(r.horas_totales),
      estado_final:   Number(r.estado_final),
      herramientas:   r.herramientas ?? null,
    }));
  }

  async findOne(id: number) {
    const seg = await this.prisma.seguimiento_practica.findUnique({
      where: { id },
      include: {
        alumno: true,
        observaciones: { orderBy: { fecha_registro: 'desc' } },
        empresa: true,
        profesor_revisor: true,
        notificaciones: true,
      },
    });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');
    return seg;
  }

  async create(alumno_id: number, practica_num: number, plan: string) {
    // Verificar que no exista ya
    const existe = await this.prisma.seguimiento_practica.findFirst({
      where: { alumno_id, practica_num },
    });
    if (existe) throw new BadRequestException('Ya existe un seguimiento para esta práctica');

    return this.prisma.seguimiento_practica.create({
      data: {
        alumno_id,
        practica_num,
        plan,
        practica1_estado: ESTADO.NO_INICIADO,
        informe_elab_estado: ESTADO.NO_INICIADO,
        informe_rev_estado: ESTADO.NO_INICIADO,
        eval_empresa_estado: ESTADO.NO_INICIADO,
        comite_carrera_estado: ESTADO.NO_INICIADO,
        envioreg_estado: ESTADO.NO_INICIADO,
      },
    });
  }

  async avanzarHito(id: number, hito: string, datos?: any) {
    const seg = await this.findOne(id);

    if (!HITOS.includes(hito)) {
      throw new BadRequestException('Hito inválido');
    }

    const hitoIndex = HITOS.indexOf(hito);

    // Verificar que el hito anterior esté aprobado
    if (hitoIndex > 0) {
      const hitoAnterior = HITOS[hitoIndex - 1];
      if (seg[hitoAnterior] !== ESTADO.APROBADO) {
        throw new BadRequestException('El hito anterior no está aprobado');
      }
    }

    return this.prisma.seguimiento_practica.update({
      where: { id },
      data: {
        [hito]: ESTADO.PENDIENTE,
        ...datos,
      },
    });
  }

  async aprobarHito(id: number, hito: string, datos?: any) {
    const seg = await this.findOne(id);

    if (!HITOS.includes(hito)) {
      throw new BadRequestException('Hito inválido');
    }

    const result = await this.prisma.seguimiento_practica.update({
      where: { id },
      data: {
        [hito]: ESTADO.APROBADO,
        ...datos,
      },
    });

    await this.recomputarEstadoFinalPractica(seg.alumno_id, seg.practica_num);

    if (hito === 'practica1_estado') {
      try {
        await this.notificarSecretaria(
          seg.alumno_id, id,
          'practica_aprobada_jefe',
          '✅ Práctica aprobada por Jefe de Carrera',
        );
      } catch (e) {}
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
           VALUES (?, 'hito_aprobado', '📝 Práctica aprobada — inicia tu informe', ?)`,
          seg.alumno_id,
          'Tu práctica profesional fue aprobada. Ya puedes comenzar la elaboración de tu informe dentro de los plazos indicados en tu seguimiento.',
        );
      } catch (e) {}
    }

    return result;
  }

  async marcarExcedido(id: number, hito: string) {
    await this.findOne(id);

    if (!HITOS.includes(hito)) {
      throw new BadRequestException('Hito inválido');
    }

    const result = await this.prisma.seguimiento_practica.update({
      where: { id },
      data: { [hito]: ESTADO.EXCEDIDO },
    });
    await this.notificarHitoExcedido(id, hito);
    return result;
  }

  private async notificarProfesorAsignado(seguimientoId: number, profesorId: number) {
    try {
      // usuarios.profesor_id → profesores.id (la relación va de usuarios hacia profesores)
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT u.id AS usuario_id, al.nombres, al.apellido1, al.rut
        FROM profesores p
        JOIN usuarios u  ON u.profesor_id  = p.id
        JOIN seguimiento_practica sp ON sp.id = ${seguimientoId}
        JOIN alumnos al ON al.id = sp.alumno_id
        WHERE p.id = ${profesorId}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const { usuario_id, nombres, apellido1, rut } = rows[0];
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notificaciones_profesor (usuario_id, seguimiento_id, alumno_id, tipo, titulo, mensaje)
           SELECT ?, ?, sp.alumno_id, 'revision_informe',
                  '📄 Informe asignado para revisión', ?
           FROM seguimiento_practica sp
           WHERE sp.id = ?
             AND NOT EXISTS (
               SELECT 1 FROM notificaciones_profesor
               WHERE seguimiento_id = ? AND usuario_id = ?
             )`,
          usuario_id, seguimientoId,
          `Debes revisar el informe de ${nombres} ${apellido1} (RUT: ${rut})`,
          seguimientoId, seguimientoId, usuario_id
        );
      }
    } catch (e) {
      console.error('[notificarProfesorAsignado] Error al crear notificación de profesor:', e);
    }
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const result = await this.prisma.seguimiento_practica.update({
      where: { id },
      data,
    });

    if (data.informe_rev_profesor_id) {
      await this.notificarProfesorAsignado(id, Number(data.informe_rev_profesor_id));
    }

    return result;
  }
  async getObservaciones(seguimiento_id: number) {
    return this.prisma.$queryRaw`
      SELECT id, seguimiento_id, hito, texto, archivo,
             fecha_recepcion, fecha_fin_recepcion, fecha_registro
      FROM seguimiento_observaciones
      WHERE seguimiento_id = ${seguimiento_id}
      ORDER BY fecha_registro DESC
    `;
  }

  async getEvaluacion(seguimiento_id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM evaluacion_informe
      WHERE seguimiento_id = ${seguimiento_id}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async evaluarInforme(
    seguimientoId: number,
    body: Record<string, string>,
    archivo?: Express.Multer.File,
  ) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');

    const alumno_id  = seg.alumno_id;
    const hoy        = new Date().toISOString().split('T')[0];

    let archivoPath: string | null = null;
    if (archivo) {
      const ext     = path.extname(archivo.originalname);
      const nombre  = `feedback_${seguimientoId}_${Date.now()}${ext}`;
      const destino = path.join('C:/xampp/htdocs/uploads/feedback', nombre);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.renameSync(archivo.path, destino);
      archivoPath = `uploads/feedback/${nombre}`;
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO evaluacion_informe
         (seguimiento_id, criterio1, criterio2, criterio3, criterio4, criterio5, criterio6,
          observaciones, resultado, archivo_feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      seguimientoId,
      body.criterio1 ?? '', body.criterio2 ?? '', body.criterio3 ?? '',
      body.criterio4 ?? '', body.criterio5 ?? '', body.criterio6 ?? '',
      body.observaciones ?? '', body.resultado, archivoPath,
    );

    const r = body.resultado;

    if (r === 'a' || r === 'b') {
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica
         SET informe_elab_estado = 2, informe_rev_estado = 2,
             informe_rev_fecha_termino = COALESCE(informe_rev_fecha_termino, ?)
         WHERE id = ?`, hoy, seguimientoId);
      await this.activarSiguienteHito(seguimientoId, seg.practica_num, 'informe_rev_estado');

      if (r === 'b' && body.observaciones?.trim()) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO seguimiento_observaciones (seguimiento_id, hito, texto, fecha_recepcion, archivo)
           VALUES (?, 'informe_rev', ?, ?, ?)`,
          seguimientoId, body.observaciones, hoy, archivoPath);
      }

      const msgAlumno = r === 'a'
        ? 'Tu informe fue aprobado sin observaciones. Continúa con el hito de Evaluación Empresa.'
        : 'Tu informe fue aprobado. Revisa las observaciones del profesor en tu seguimiento.';
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
         VALUES (?, 'hito_aprobado', '✅ Informe aprobado', ?)`,
        alumno_id, msgAlumno);

      // Eliminar notificaciones del profesor para este seguimiento
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM notificaciones_profesor WHERE seguimiento_id = ?`, seguimientoId);

      // Notificar a la secretaria que el profesor evaluó el informe
      try {
        await this.notificarSecretaria(
          alumno_id, seguimientoId,
          'profesor_evaluo_informe',
          r === 'a'
            ? '👨‍🏫 Profesor aprobó el informe (sin observaciones)'
            : '👨‍🏫 Profesor aprobó el informe (con observaciones)',
        );
      } catch (e) {}

      // Notificar al empleador de la empresa para que evalúe al alumno
      try {
        const empRows = await this.prisma.$queryRaw<any[]>`
          SELECT u.id AS usuario_id, al.nombres, al.apellido1, al.rut
          FROM seguimiento_practica sp
          JOIN empresas e    ON e.id   = sp.empresa_id
          JOIN empleadores em ON em.empresa_id = e.id
          JOIN usuarios u    ON u.empleador_id = em.id
          JOIN alumnos al    ON al.id = sp.alumno_id
          WHERE sp.id = ${seguimientoId}
          LIMIT 1
        `;
        if (empRows.length > 0) {
          const { usuario_id, nombres, apellido1, rut } = empRows[0];
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO notificaciones_empleador
               (usuario_id, seguimiento_id, alumno_id, tipo, titulo, mensaje)
             SELECT ?, ?, sp.alumno_id, 'eval_empresa',
                    '📋 Evaluación de alumno pendiente', ?
             FROM seguimiento_practica sp WHERE sp.id = ?
             AND NOT EXISTS (
               SELECT 1 FROM notificaciones_empleador
               WHERE seguimiento_id = ? AND usuario_id = ?
             )`,
            usuario_id, seguimientoId,
            `El alumno ${nombres} ${apellido1} (RUT: ${rut}) completó su período de práctica. Por favor complete el Informe Confidencial de evaluación.`,
            seguimientoId, seguimientoId, usuario_id
          );
        }
      } catch (e) {
        console.error('[evaluarInforme] Error al notificar al empleador:', e);
      }

    } else if (r === 'c') {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO seguimiento_observaciones (seguimiento_id, hito, texto, fecha_recepcion, archivo)
         VALUES (?, 'informe_rev', ?, ?, ?)`,
        seguimientoId, body.observaciones ?? '', hoy, archivoPath);
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica
         SET informe_elab_estado = 1, informe_final = NULL
         WHERE id = ?`, seguimientoId);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
         VALUES (?, 'hito_excedido', '📝 Informe debe ser reformulado', ?)`,
        alumno_id,
        `El profesor revisó tu informe y requiere reformulación. Descarga las indicaciones en tu seguimiento y sube una versión corregida.`);

    } else if (r === 'd') {
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica
         SET informe_rev_estado = 3, informe_elab_estado = 3
         WHERE id = ?`, seguimientoId);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
         VALUES (?, 'hito_excedido', '❌ Informe rechazado', ?)`,
        alumno_id,
        `Tu informe fue rechazado. Debes realizar nuevamente la práctica profesional.`);
      // Notificar a la secretaria del rechazo
      try {
        await this.notificarSecretaria(
          alumno_id, seguimientoId,
          'profesor_rechazo_informe',
          '❌ Profesor rechazó el informe — alumno debe repetir práctica',
        );
      } catch (e) {}
    }

    return { ok: true };
  }

  async getEvaluacionesEmpleador(usuario_id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        al.nombres, al.apellido1, al.rut,
        sp.id               AS seguimiento_id,
        sp.practica_num,
        COALESCE(sp.eval_empresa_estado, 0) AS eval_empresa_estado,
        sp.practica1_fecha_inicio,
        sp.practica1_fecha_termino,
        sp.practica1_horas_sem,
        sp.practica1_horas_tot,
        sp.practica1_supervisor,
        sp.practica1_jefe,
        e.nombre    AS empresa_nombre,
        e.direccion AS empresa_direccion
      FROM seguimiento_practica sp
      JOIN alumnos al   ON al.id  = sp.alumno_id
      JOIN empresas e   ON e.id   = sp.empresa_id
      JOIN empleadores em ON em.empresa_id = e.id
      JOIN usuarios u   ON u.empleador_id  = em.id
      WHERE u.id = ${usuario_id}
        AND COALESCE(sp.practica1_estado, 0) > 0
        AND COALESCE(sp.estado_final_practica, 0) != 2
      ORDER BY sp.practica1_fecha_inicio DESC
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id:       Number(r.seguimiento_id),
      practica_num:         Number(r.practica_num),
      eval_empresa_estado:  Number(r.eval_empresa_estado),
    }));
  }

  // Empleador: listado histórico de todos los alumnos que han hecho práctica en
  // su empresa (sin filtrar por estado, a diferencia de getEvaluacionesEmpleador).
  async getAlumnosEmpresa(usuario_id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        al.nombres, al.apellido1, al.apellido2, al.rut,
        sp.id               AS seguimiento_id,
        sp.practica_num,
        COALESCE(sp.eval_empresa_estado, 0)    AS eval_empresa_estado,
        COALESCE(sp.estado_final_practica, 0)  AS estado_final_practica,
        sp.practica1_fecha_inicio,
        sp.practica1_fecha_termino,
        sp.practica1_horas_sem,
        sp.practica1_horas_tot,
        sp.practica1_supervisor,
        sp.practica1_jefe
      FROM seguimiento_practica sp
      JOIN alumnos al   ON al.id  = sp.alumno_id
      JOIN empresas e   ON e.id   = sp.empresa_id
      JOIN empleadores em ON em.empresa_id = e.id
      JOIN usuarios u   ON u.empleador_id  = em.id
      WHERE u.id = ${usuario_id}
      ORDER BY sp.practica1_fecha_inicio DESC
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id:        Number(r.seguimiento_id),
      practica_num:          Number(r.practica_num),
      eval_empresa_estado:   Number(r.eval_empresa_estado),
      estado_final_practica: Number(r.estado_final_practica),
    }));
  }

  async getEvaluacionEmpresa(seguimientoId: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM evaluacion_empresa
      WHERE seguimiento_id = ${seguimientoId}
      ORDER BY created_at DESC LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async evaluarEmpresa(seguimientoId: number, body: Record<string, string>) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');
    const hoy = new Date().toISOString().split('T')[0];

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO evaluacion_empresa
         (seguimiento_id, criterio_asistencia, criterio_cantidad, criterio_calidad,
          criterio_normativas, criterio_aprendizaje, criterio_conocimientos,
          criterio_habilidades, criterio_trabajo_equipo,
          descripcion_trabajo, comentarios, utilidad)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      seguimientoId,
      body.criterio_asistencia ?? '', body.criterio_cantidad ?? '',
      body.criterio_calidad ?? '',   body.criterio_normativas ?? '',
      body.criterio_aprendizaje ?? '', body.criterio_conocimientos ?? '',
      body.criterio_habilidades ?? '', body.criterio_trabajo_equipo ?? '',
      body.descripcion_trabajo ?? '', body.comentarios ?? '', body.utilidad ?? ''
    );

    // Actualizar supervisor si el empleador lo informó
    if (body.nombre_supervisor?.trim()) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET practica1_supervisor = ? WHERE id = ?`,
        body.nombre_supervisor.trim(), seguimientoId
      );
    }

    // Aprobar hito 4 automáticamente
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica
       SET eval_empresa_estado = 2,
           eval_empresa_fecha_termino = COALESCE(eval_empresa_fecha_termino, ?)
       WHERE id = ?`, hoy, seguimientoId);

    // Avanzar hito 5 (comité de carrera) a pendiente, con fechas según hito_duraciones
    await this.activarSiguienteHito(seguimientoId, seg.practica_num, 'eval_empresa_estado');

    // Generar y guardar el informe confidencial automáticamente
    this.generadoresSvc.generarInformeConfidencial(seguimientoId).catch(e =>
      console.error('No se pudo auto-generar informe confidencial:', e)
    );

    // Eliminar notificación del empleador para este seguimiento
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM notificaciones_empleador WHERE seguimiento_id = ?`, seguimientoId);

    // Notificar al alumno
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje)
       VALUES (?, 'hito_aprobado', '✅ Evaluación empresa completada',
               'La empresa completó tu evaluación de práctica. Consulta tu seguimiento.')`,
      seg.alumno_id);

    // Notificar a la secretaria que el empleador completó la evaluación
    try {
      await this.notificarSecretaria(
        seg.alumno_id, seguimientoId,
        'empresa_evaluo',
        '🏢 Empleador completó la evaluación de práctica',
      );
    } catch (e) {}

    return { ok: true };
  }

  async addObservacion(seguimiento_id: number, hito: string, datos: any) {
    return this.prisma.seguimiento_observaciones.create({
      data: {
        seguimiento_id,
        hito,
        fecha_recepcion: datos.fecha_recepcion 
          ? new Date(datos.fecha_recepcion) 
          : null,
        fecha_fin_recepcion: datos.fecha_fin_recepcion 
          ? new Date(datos.fecha_fin_recepcion) 
          : null,
      },
    });
  }
  async updateObservacion(id: number, data: any) {
    return this.prisma.seguimiento_observaciones.update({
      where: { id },
      data: {
        fecha_fin_recepcion: data.fecha_fin_recepcion 
          ? new Date(data.fecha_fin_recepcion) 
          : null,
      },
    });
  }
  async findPendientes() {
    return this.prisma.seguimiento_practica.findMany({
      where: {
        estado_final_practica: 0,
        OR: HITOS.map(hito => ({ [hito]: ESTADO.PENDIENTE })),
      },
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
    });
  }
  async getDuraciones() {
    return this.prisma.hito_duraciones.findMany({
      orderBy: [{ practica_num: 'asc' }, { hito_num: 'asc' }],
    });
  }
  async subirInforme(seguimiento_id: number, alumno_id: number, practica_num: number, file: Express.Multer.File, obs_id?: number) {
    const ext = path.extname(file.originalname);
    const nombreArchivo = `informe_p${practica_num}_${alumno_id}_${Date.now()}${ext}`;
    const destino = path.join('C:/xampp/htdocs/uploads/informes', nombreArchivo);
    const rutaBD = `uploads/informes/${nombreArchivo}`;
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.renameSync(file.path, destino);
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET informe_final = ?, informe_fecha_subida = CURRENT_TIMESTAMP, informe_elab_estado = 2 WHERE id = ?`,
      rutaBD, seguimiento_id
    );
    // Avanzar hito 3 (revisión informe) a pendiente, con fechas según hito_duraciones
    await this.activarSiguienteHito(seguimiento_id, practica_num, 'informe_elab_estado');
    // Notificar a la secretaria que el alumno subió su informe
    try {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM notificaciones WHERE alumno_id = ? AND seguimiento_id = ? AND hito = 'informe_subido'`,
        alumno_id, seguimiento_id,
      );
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones (alumno_id, seguimiento_id, hito, hito_label, fecha_vencimiento)
         VALUES (?, ?, 'informe_subido', '📄 Alumno subió su informe de práctica', CURDATE())`,
        alumno_id, seguimiento_id,
      );
    } catch (e) {}
    if (obs_id) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_observaciones SET fecha_fin_recepcion = CURDATE() WHERE id = ?`,
        obs_id
      );
      // Notificar al profesor que el alumno entregó la versión corregida
      try {
        const rows = await this.prisma.$queryRaw<any[]>`
          SELECT u.id AS usuario_id, al.nombres, al.apellido1, al.rut
          FROM seguimiento_practica sp
          JOIN profesores p  ON p.id  = sp.informe_rev_profesor_id
          JOIN usuarios u    ON u.profesor_id = p.id
          JOIN alumnos al    ON al.id = sp.alumno_id
          WHERE sp.id = ${seguimiento_id}
          LIMIT 1
        `;
        if (rows.length > 0) {
          const { usuario_id, nombres, apellido1, rut } = rows[0];
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO notificaciones_profesor
               (usuario_id, seguimiento_id, alumno_id, tipo, titulo, mensaje)
             SELECT ?, ?, sp.alumno_id, 'revision_informe',
                    '🔄 Informe corregido entregado', ?
             FROM seguimiento_practica sp WHERE sp.id = ?`,
            usuario_id, seguimiento_id,
            `El alumno ${nombres} ${apellido1} (RUT: ${rut}) entregó una versión corregida de su informe. Por favor revísalo.`,
            seguimiento_id
          );
        }
      } catch (e) {
        console.error('[subirInforme] Error al notificar al profesor:', e);
      }
    }
    return { ok: true, ruta: rutaBD };
  }

  async subirEvalEmpresa(seguimiento_id: number, alumno_id: number, practica_num: number, file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const nombreArchivo = `eval_empresa_p${practica_num}_${alumno_id}_${Date.now()}${ext}`;
    const destino = path.join('C:/xampp/htdocs/uploads/evaluaciones', nombreArchivo);
    const rutaBD = `uploads/evaluaciones/${nombreArchivo}`;
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.renameSync(file.path, destino);
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET eval_empresa_archivo = ? WHERE id = ?`,
      rutaBD, seguimiento_id
    );
    return { ok: true, ruta: rutaBD };
  }

  async subirActaFirmada(seguimiento_id: number, alumno_id: number, practica_num: number, file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const nombreArchivo = `acta_firmada_p${practica_num}_${alumno_id}_${Date.now()}${ext}`;
    const destino = path.join('C:/xampp/htdocs/uploads/actas', nombreArchivo);
    const rutaBD = `uploads/actas/${nombreArchivo}`;
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.renameSync(file.path, destino);
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET acta_firmada = ? WHERE id = ?`,
      rutaBD, seguimiento_id
    );
    return { ok: true, ruta: rutaBD };
  }

  async getCandidatos() {
    const result = await this.prisma.$queryRaw`
      SELECT
        a.id, a.rut, a.nombres, a.apellido1, a.apellido2,
        a.plan, a.plan_texto,
        ROUND((a.avance / 100) * 65) AS ramos_aprobados,
        IFNULL(sp1.practica1_estado, 0) AS practica1_estado,
        IFNULL(sp1.envioreg_estado, 0)  AS envioreg_estado,
        (ROUND((a.avance / 100) * 65) >= 40) AS puede_p1,
        (ROUND((a.avance / 100) * 65) >= 40 AND IFNULL(sp1.envioreg_estado, 0) = 2) AS puede_p2,
        a.tipo,
        COALESCE(a.plan_texto, CAST(a.plan AS CHAR)) AS plan_display
      FROM alumnos a
      LEFT JOIN seguimiento_practica sp1 ON a.id = sp1.alumno_id AND sp1.practica_num = 1
      LEFT JOIN seguimiento_practica sp2 ON a.id = sp2.alumno_id AND sp2.practica_num = 2
      WHERE a.tipo = 'regular'
        AND ROUND((a.avance / 100) * 65) >= 40
        AND (
          (IFNULL(sp1.practica1_estado, 0) = 0 AND sp2.id IS NULL)
          OR
          (IFNULL(sp1.envioreg_estado, 0) = 2 AND sp2.id IS NULL)
        )

      UNION ALL

      SELECT
        a.id, a.rut, a.nombres, a.apellido1, a.apellido2,
        a.plan, a.plan_texto,
        0 AS ramos_aprobados,
        IFNULL(sp1.practica1_estado, 0) AS practica1_estado,
        IFNULL(sp1.envioreg_estado, 0)  AS envioreg_estado,
        1 AS puede_p1,
        (IFNULL(sp1.envioreg_estado, 0) = 2) AS puede_p2,
        a.tipo,
        COALESCE(a.plan_texto, 'Sin plan') AS plan_display
      FROM alumnos a
      LEFT JOIN seguimiento_practica sp1 ON a.id = sp1.alumno_id AND sp1.practica_num = 1
      LEFT JOIN seguimiento_practica sp2 ON a.id = sp2.alumno_id AND sp2.practica_num = 2
      WHERE a.tipo = 'especial'
        AND (
          (IFNULL(sp1.practica1_estado, 0) = 0 AND sp2.id IS NULL)
          OR
          (IFNULL(sp1.envioreg_estado, 0) = 2 AND sp2.id IS NULL)
        )

      ORDER BY apellido1, apellido2, nombres
    `;

    // Mapear igual que el PHP original
    return (result as any[]).map(row => ({
      id: row.id,
      rut: row.rut,
      nombre: row.nombres,
      apellidos: `${row.apellido1} ${row.apellido2 ?? ''}`.trim(),
      ramos_aprobados: Number(row.ramos_aprobados),
      practica1_estado: Number(row.practica1_estado),
      envioreg_estado: Number(row.envioreg_estado),
      puede_p1: Boolean(row.puede_p1),
      puede_p2: Boolean(row.puede_p2),
      tipo: row.tipo,
      plan_display: row.plan_display,
      plan: row.plan,
      plan_texto: row.plan_texto ?? null,
    }));
  }

  // ── Exportar CSV ──────────────────────────────────────────────────────────

  async exportarCSV(filtros: { practica_num: number; rut?: string; nombre?: string; plan?: string }): Promise<string> {
    const rows = await this.findAll(filtros.practica_num) as any[];

    let lista = rows;
    if (filtros.rut)    lista = lista.filter(r => String(r.rut ?? '').toLowerCase().includes(filtros.rut!.toLowerCase()));
    if (filtros.nombre) {
      const n = filtros.nombre.toLowerCase();
      lista = lista.filter(r => `${r.nombres ?? ''} ${r.apellido1 ?? ''} ${r.apellido2 ?? ''}`.toLowerCase().includes(n));
    }
    if (filtros.plan)   lista = lista.filter(r => String(r.plan ?? '') === filtros.plan);

    const LABEL = ['practica1', 'Informe Elabor.', 'Informe Revision', 'Eval. Empresa', 'Comite Carrera', 'Envio Registro'];
    const headers = [
      'RUT', 'Nombres', 'Apellido1', 'Apellido2', 'Plan', 'Practica_Num',
      'practica1_estado', 'informe_elab_estado', 'informe_rev_estado',
      'eval_empresa_estado', 'comite_carrera_estado', 'envioreg_estado',
    ];

    const esc = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];
    for (const r of lista) {
      lines.push([
        r.rut, r.nombres, r.apellido1, r.apellido2, r.plan, r.practica_num,
        r.practica1_estado, r.informe_elab_estado, r.informe_rev_estado,
        r.eval_empresa_estado, r.comite_carrera_estado, r.envioreg_estado,
      ].map(esc).join(','));
    }
    return lines.join('\r\n');
  }

  // ── Importar CSV ──────────────────────────────────────────────────────────

  async importarCSV(file: Express.Multer.File, practica_num: number): Promise<{ importados: number; omitidos: number; no_existen_en_bd: number }> {
    const contenido = fs.readFileSync(file.path, 'utf-8');
    fs.unlinkSync(file.path);

    const lines = contenido.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^﻿/, '').trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV vacío');

    const delim = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

    const idxRut = headers.findIndex(h => h === 'rut');
    if (idxRut < 0) throw new BadRequestException('El CSV debe tener columna rut');

    const STATE_FIELDS = [
      'practica1_estado', 'informe_elab_estado', 'informe_rev_estado',
      'eval_empresa_estado', 'comite_carrera_estado', 'envioreg_estado',
    ];

    let importados = 0, omitidos = 0, no_existen_en_bd = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.every(c => !c)) continue;

      const rut = cols[idxRut]?.trim();
      if (!rut) { omitidos++; continue; }

      // Compara ignorando puntos/guion/mayúsculas: el RUT del CSV puede no calzar
      // exactamente con el formato almacenado (ver alumnos.service.ts).
      const rutNorm = rut.replace(/[^0-9kK]/g, '').toUpperCase();
      const coincidencias = await this.prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM alumnos
        WHERE UPPER(REPLACE(REPLACE(rut, '.', ''), '-', '')) = ${rutNorm}
        LIMIT 1
      `;
      const alumno = coincidencias[0] ?? null;
      if (!alumno) { no_existen_en_bd++; continue; }

      const sp = await this.prisma.seguimiento_practica.findFirst({
        where: { alumno_id: alumno.id, practica_num },
      });
      if (!sp) { no_existen_en_bd++; continue; }

      const data: any = {};
      for (const field of STATE_FIELDS) {
        const idx = headers.findIndex(h => h === field);
        if (idx >= 0 && cols[idx] !== undefined && cols[idx] !== '') {
          const val = parseInt(cols[idx]);
          if ([0, 1, 2, 3].includes(val)) data[field] = val;
        }
      }

      if (Object.keys(data).length === 0) { omitidos++; continue; }

      await this.prisma.seguimiento_practica.update({ where: { id: sp.id }, data });
      importados++;
    }

    return { importados, omitidos, no_existen_en_bd };
  }

  // ── Hito 3: solicitud de profesor evaluador ────────────────────────

  private async crearNotifSolicitudProfesor(seguimientoId: number) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO notificaciones (alumno_id, seguimiento_id, hito, hito_label, fecha_vencimiento)
       VALUES (?, ?, 'profesor_evaluador', ?, CURDATE())`,
      seg.alumno_id, seguimientoId, '📋 Se solicita profesor evaluador',
    );
  }

  async solicitarProfesorEvaluador(seguimientoId: number) {
    await this.crearNotifSolicitudProfesor(seguimientoId);
    return { ok: true };
  }

  async solicitarProfesorEvaluadorBulk(seguimientoIds: number[]) {
    for (const id of seguimientoIds) {
      await this.crearNotifSolicitudProfesor(id);
    }
    return { ok: true, total: seguimientoIds.length };
  }

  // Alumnos con Hito 2 (elaboración informe) aprobado y Hito 3 (revisión informe) en curso
  private async evaluacionInformesBase() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.id AS alumno_id,
        a.rut,
        a.nombres,
        a.apellido1,
        a.apellido2,
        sp.id AS seguimiento_id,
        sp.practica_num,
        sp.informe_rev_profesor_id,
        sp.informe_rev_profesor_propuesto_id,
        COALESCE(e.nombre, sp.practica1_empresa) AS empresa
      FROM alumnos a
      INNER JOIN seguimiento_practica sp ON sp.alumno_id = a.id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE sp.informe_elab_estado = 2 AND sp.informe_rev_estado = 1
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
    return rows.map(r => ({
      ...r,
      alumno_id: Number(r.alumno_id),
      seguimiento_id: Number(r.seguimiento_id),
      informe_rev_profesor_id: r.informe_rev_profesor_id != null ? Number(r.informe_rev_profesor_id) : null,
      informe_rev_profesor_propuesto_id: r.informe_rev_profesor_propuesto_id != null ? Number(r.informe_rev_profesor_propuesto_id) : null,
    }));
  }

  // Jefe de carrera / secretaria: oculta a los alumnos para los que ya se envió una solicitud ICCI
  async getEvaluacionInformes() {
    const [rows, solicitudes] = await Promise.all([
      this.evaluacionInformesBase(),
      this.prisma.solicitudes_profesor_evaluador.findMany({ select: { seguimiento_ids: true } }),
    ]);
    const yaSolicitados = new Set<number>();
    solicitudes.forEach(s => s.seguimiento_ids.split(',').forEach(id => yaSolicitados.add(Number(id))));
    return rows.filter(r => !yaSolicitados.has(r.seguimiento_id));
  }

  // Director de departamento: solo alumnos con solicitud ICCI ya enviada (si no,
  // no habría carta que referenciar en el acta) y que aún no tienen académico
  // evaluador asignado.
  async getPendientesAsignacionAcademico() {
    const [rows, solicitudes] = await Promise.all([
      this.evaluacionInformesBase(),
      this.prisma.solicitudes_profesor_evaluador.findMany({ select: { seguimiento_ids: true } }),
    ]);
    const yaSolicitados = new Set<number>();
    solicitudes.forEach(s => s.seguimiento_ids.split(',').forEach(id => yaSolicitados.add(Number(id))));
    return rows.filter(r => !r.informe_rev_profesor_id && yaSolicitados.has(r.seguimiento_id));
  }

  // Director de departamento: guarda una propuesta de académico evaluador por
  // alumno (sin oficializarla todavía) y notifica a secretaría, que es quien
  // genera el acta y con eso deja la asignación oficial (ver asignarProfesorEvaluador).
  async proponerProfesoresEvaluadores(asignaciones: { seguimiento_id: number; profesor_id: number }[]) {
    for (const a of asignaciones) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET informe_rev_profesor_propuesto_id = ? WHERE id = ?`,
        a.profesor_id, a.seguimiento_id,
      );

      const seg = await this.prisma.seguimiento_practica.findUnique({
        where: { id: a.seguimiento_id },
        select: { alumno_id: true },
      });
      if (!seg) continue;
      const alumno = await this.prisma.alumnos.findUnique({
        where: { id: seg.alumno_id },
        select: { nombres: true, apellido1: true },
      });
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO notificaciones (alumno_id, seguimiento_id, hito, hito_label, fecha_vencimiento)
         VALUES (?, ?, 'profesor_evaluador_propuesto', ?, CURDATE())`,
        seg.alumno_id, a.seguimiento_id,
        `📝 Evaluador propuesto: ${alumno?.nombres ?? ''} ${alumno?.apellido1 ?? ''} — listo para generar acta`.slice(0, 100),
      );
    }
    return { ok: true, actualizados: asignaciones.length };
  }

  // Secretaría DICI: alumnos con evaluador propuesto por el director, pendientes
  // de que ella genere el acta (lo que oficializa la asignación).
  async getListosParaActa() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.id AS seguimiento_id, sp.practica_num,
        sp.informe_rev_profesor_propuesto_id AS profesor_propuesto_id,
        CONCAT(p.nombre, ' ', p.apellido1, ' ', COALESCE(p.apellido2, '')) AS profesor_propuesto_nombre
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      JOIN profesores p ON p.id = sp.informe_rev_profesor_propuesto_id
      WHERE sp.informe_rev_profesor_propuesto_id IS NOT NULL AND sp.informe_rev_profesor_id IS NULL
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id: Number(r.seguimiento_id),
      profesor_propuesto_id: Number(r.profesor_propuesto_id),
    }));
  }

  // Director de departamento: cantidad de informes que cada académico evaluador
  // está evaluando (asignado, aún sin resolución) y ya evaluó. Un informe cuenta
  // como evaluado si tiene un registro en evaluacion_informe o si el hito quedó
  // aprobado (informe_rev_estado >= 2) aunque el formulario no se haya llenado
  // -por ejemplo, cuando el estado se ajusta manualmente con los datos oficiales-.
  async getResumenProfesorEvaluador() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        p.id AS profesor_id,
        CONCAT(p.nombre, ' ', p.apellido1, ' ', COALESCE(p.apellido2, '')) AS profesor_nombre,
        SUM(CASE WHEN sp.id IS NOT NULL AND ei.seguimiento_id IS NULL AND sp.informe_rev_estado < 2 THEN 1 ELSE 0 END) AS evaluando,
        SUM(CASE WHEN ei.seguimiento_id IS NOT NULL OR sp.informe_rev_estado >= 2 THEN 1 ELSE 0 END) AS evaluados
      FROM profesores p
      LEFT JOIN seguimiento_practica sp ON sp.informe_rev_profesor_id = p.id
      LEFT JOIN (SELECT DISTINCT seguimiento_id FROM evaluacion_informe) ei ON ei.seguimiento_id = sp.id
      WHERE p.activo = 1
      GROUP BY p.id, profesor_nombre
      ORDER BY profesor_nombre
    `;
    return rows.map(r => ({
      profesor_id: Number(r.profesor_id),
      profesor_nombre: r.profesor_nombre,
      evaluando: Number(r.evaluando),
      evaluados: Number(r.evaluados),
    }));
  }

  // Profesores / director de departamento: alumnos cuyo informe ya fue evaluado, con el
  // académico que hizo la evaluación (última evaluación registrada por seguimiento).
  // Incluye también los hitos marcados como aprobados (informe_rev_estado >= 2) con
  // académico asignado aunque no tengan formulario registrado (p.ej. estado ajustado
  // manualmente con los datos oficiales). No incluye prácticas antiguas migradas sin
  // académico evaluador asignado.
  async getAlumnosEvaluados() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.id AS seguimiento_id, sp.practica_num,
        CONCAT(p.nombre, ' ', p.apellido1, ' ', COALESCE(p.apellido2, '')) AS profesor_nombre,
        ei.resultado,
        COALESCE(ei.created_at, sp.informe_rev_fecha_aprobacion, sp.informe_rev_fecha_termino) AS fecha_evaluacion
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN profesores p ON p.id = sp.informe_rev_profesor_id
      LEFT JOIN evaluacion_informe ei ON ei.id = (
        SELECT MAX(id) FROM evaluacion_informe e2 WHERE e2.seguimiento_id = sp.id
      )
      WHERE ei.id IS NOT NULL
         OR (sp.informe_rev_estado >= 2 AND sp.informe_rev_profesor_id IS NOT NULL)
      ORDER BY fecha_evaluacion DESC
    `;
    return rows.map(r => ({ ...r, seguimiento_id: Number(r.seguimiento_id) }));
  }

  // Jefe de carrera / secretaría (solo lectura): alumnos con Hito 4 (Evaluación
  // Empresa) aprobado, enviados manualmente por informe atrasado (informe_atrasado
  // = 2) o por práctica (hito 1) atrasada (practica1_atrasada = 2), con Hito 5
  // (Comité de Carrera) pendiente de decisión.
  // Una vez aprobados o rechazados dejan de aparecer en esta lista.
  async getComitePendientes() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.id AS seguimiento_id, sp.practica_num,
        COALESCE(e.nombre, sp.practica1_empresa) AS empresa,
        sp.eval_empresa_archivo,
        COALESCE(sp.comite_carrera_estado, 0) AS comite_carrera_estado,
        COALESCE(sp.informe_atrasado, 0) AS informe_atrasado,
        COALESCE(sp.practica1_atrasada, 0) AS practica1_atrasada
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE (sp.eval_empresa_estado = 2 OR sp.informe_atrasado = 2 OR sp.practica1_atrasada = 2)
        AND sp.comite_carrera_estado = 1
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id: Number(r.seguimiento_id),
      comite_carrera_estado: Number(r.comite_carrera_estado),
      informe_atrasado: Number(r.informe_atrasado),
      practica1_atrasada: Number(r.practica1_atrasada),
    }));
  }

  // Secretaría (solo lectura): alumnos rechazados por el comité, todavía sin
  // reiniciar. Desaparecen de esta lista en cuanto secretaría elimina el
  // seguimiento (ver eliminarSeguimiento).
  async getComiteRechazados() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.id AS seguimiento_id, sp.practica_num,
        COALESCE(e.nombre, sp.practica1_empresa) AS empresa,
        COALESCE(sp.informe_atrasado, 0) AS informe_atrasado
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE sp.comite_carrera_estado = 3
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id: Number(r.seguimiento_id),
      informe_atrasado: Number(r.informe_atrasado),
    }));
  }

  // Secretaría: alumnos flageados por el cron (informe_atrasado = 1), pendientes
  // de que ella decida enviarlos a la cola de decisión del comité de carrera.
  async getInformesAtrasados() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.id AS seguimiento_id, sp.practica_num,
        sp.informe_elab_fecha_termino,
        DATEDIFF(CURDATE(), sp.informe_elab_fecha_termino) AS dias_atraso
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      WHERE sp.informe_atrasado = 1
      ORDER BY sp.informe_elab_fecha_termino ASC
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id: Number(r.seguimiento_id),
      dias_atraso: Number(r.dias_atraso),
    }));
  }

  // Jefe de carrera / secretaría: alumnos flageados por el cron (practica1_atrasada
  // = 1) por no tener el hito 1 (aprobación de la práctica) resuelto 2 meses
  // después de su fecha de término, pendientes de enviarse a comité de carrera.
  async getPracticasAtrasadas() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.id AS seguimiento_id, sp.practica_num,
        sp.practica1_fecha_termino,
        DATEDIFF(CURDATE(), sp.practica1_fecha_termino) AS dias_atraso
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      WHERE sp.practica1_atrasada = 1
      ORDER BY sp.practica1_fecha_termino ASC
    `;
    return rows.map(r => ({
      ...r,
      seguimiento_id: Number(r.seguimiento_id),
      dias_atraso: Number(r.dias_atraso),
    }));
  }

  // Secretaría: envía manualmente a un alumno con informe atrasado a la cola de
  // decisión del comité de carrera, saltándose el filtro normal de evaluación
  // de empresa (que nunca se alcanzó porque el alumno se quedó atascado antes).
  async enviarComiteAtrasado(seguimientoId: number) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');
    if (seg.informe_atrasado !== 1) {
      throw new BadRequestException('Este alumno no está marcado como informe atrasado pendiente de envío');
    }
    return this.prisma.seguimiento_practica.update({
      where: { id: seguimientoId },
      data: { informe_atrasado: 2, comite_carrera_estado: ESTADO.PENDIENTE },
    });
  }

  // Jefe de carrera / secretaría: envía manualmente a un alumno con el hito 1
  // (práctica) atrasado a la cola de decisión del comité de carrera.
  async enviarComitePracticaAtrasada(seguimientoId: number) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');
    if (seg.practica1_atrasada !== 1) {
      throw new BadRequestException('Este alumno no está marcado como práctica atrasada pendiente de envío');
    }
    return this.prisma.seguimiento_practica.update({
      where: { id: seguimientoId },
      data: { practica1_atrasada: 2, comite_carrera_estado: ESTADO.PENDIENTE },
    });
  }

  async decidirComite(seguimientoId: number, decision: 'aprobado' | 'rechazado') {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');

    if (decision === 'aprobado' && seg.informe_atrasado === 2) {
      // El alumno llegó a comité por la vía de "informe atrasado", saltándose
      // los hitos 2-4. Si el comité igual lo aprueba, hay que cerrar esos hitos
      // ahora para que recomputarEstadoFinalPractica no quede atascado en
      // "rechazado" por culpa de un informe_elab_estado en 1 o 3.
      const hoy = new Date().toISOString().split('T')[0];
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica
         SET informe_elab_estado = 2, informe_elab_fecha_aprobacion = COALESCE(informe_elab_fecha_aprobacion, ?),
             informe_rev_estado = 2, informe_rev_fecha_aprobacion = COALESCE(informe_rev_fecha_aprobacion, ?),
             eval_empresa_estado = 2, eval_empresa_fecha_aprobacion = COALESCE(eval_empresa_fecha_aprobacion, ?)
         WHERE id = ?`,
        hoy, hoy, hoy, seguimientoId,
      );
    }

    if (decision === 'aprobado' && seg.practica1_atrasada === 2) {
      // El alumno llegó a comité por la vía de "práctica atrasada" (hito 1 sin
      // aprobar). Si el comité lo aprueba, hay que cerrar el hito 1 ahora para
      // que el alumno pueda seguir normalmente con la elaboración del informe.
      const hoy = new Date().toISOString().split('T')[0];
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica
         SET practica1_estado = 2, practica1_fecha_aprobacion = COALESCE(practica1_fecha_aprobacion, ?)
         WHERE id = ?`,
        hoy, seguimientoId,
      );
    }

    const valor = decision === 'aprobado' ? ESTADO.APROBADO : ESTADO.EXCEDIDO;
    return this.updateCampo({
      alumno_id: seg.alumno_id,
      plan: seg.plan,
      practica_num: seg.practica_num,
      campo: 'comite_carrera_estado',
      valor,
    });
  }

  // Secretaría: elimina por completo el seguimiento de una práctica rechazada
  // por el comité, para que el alumno vuelva a ser candidato desde cero.
  async eliminarSeguimiento(seguimientoId: number) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');
    if (seg.comite_carrera_estado !== ESTADO.EXCEDIDO) {
      throw new BadRequestException('Solo se puede eliminar el seguimiento de una práctica rechazada por el comité');
    }
    await this.prisma.seguimiento_practica.delete({ where: { id: seguimientoId } });
    return { ok: true };
  }

  async asignarProfesorEvaluador(seguimientoId: number, profesorId: number) {
    const seg = await this.prisma.seguimiento_practica.findUnique({ where: { id: seguimientoId } });
    if (!seg) throw new NotFoundException('Seguimiento no encontrado');
    const result = await this.prisma.seguimiento_practica.update({
      where: { id: seguimientoId },
      data: { informe_rev_profesor_id: profesorId },
    });
    await this.notificarProfesorAsignado(seguimientoId, profesorId);
    return result;
  }
}
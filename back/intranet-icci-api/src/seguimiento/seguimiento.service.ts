import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeneradoresService } from '../generadores/generadores.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
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

@Injectable()
export class SeguimientoService {
  constructor(
    private prisma: PrismaService,
    private generadoresSvc: GeneradoresService,
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
        await this.prisma.$executeRawUnsafe(
          `UPDATE seguimiento_practica SET informe_rev_estado = 1
           WHERE alumno_id = ? AND practica_num = ? AND informe_rev_estado = 0`,
          alumno_id, practica_num
        );
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
      }
      return;
    }

    const diasRestantes = Math.ceil((termino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 5) {
      const existing = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM notificaciones_alumno
        WHERE alumno_id = ${alumno_id} AND tipo = 'informe_recordatorio'
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
      await this.checkInformeDeadline(alumno_id, practica_num, seg).catch(() => {});
    }
    return rows;
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

    // Si se aprueba un hito (valor = 2), avanzar el siguiente a pendiente
    if (campo.includes('_estado') && Number(valor) === 2) {
      const secuencia: Record<string, string> = {
        'practica1_estado':      'informe_elab_estado',
        'informe_elab_estado':   'informe_rev_estado',
        'informe_rev_estado':    'eval_empresa_estado',
        'eval_empresa_estado':   'comite_carrera_estado',
        'comite_carrera_estado': 'envioreg_estado',
      };

      if (secuencia[campo]) {
        const siguienteHito = secuencia[campo];
        await this.prisma.$executeRawUnsafe(
          `UPDATE seguimiento_practica SET \`${siguienteHito}\` = 1
          WHERE alumno_id = ? AND practica_num = ?
          AND \`${siguienteHito}\` = 0`,
          alumno_id, practica_num
        );
      }

      // ── Auto-relleno de fechas ─────────────────────────────────────────────
      const fmtDate = (d: Date) => d.toISOString().split('T')[0];
      const hoy     = new Date();
      const manana  = new Date(hoy); manana.setDate(hoy.getDate() + 1);

      // Días estimados de duración para cada hito siguiente
      const duracionSiguiente: Record<string, number> = {
        'practica1_estado':      30,  // informe_elab: 30 días
        'informe_elab_estado':   15,  // informe_rev:  15 días
        'informe_rev_estado':     7,  // eval_empresa:  7 días
        'eval_empresa_estado':   15,  // comite:        15 días
        'comite_carrera_estado':  7,  // envioreg:       7 días
      };

      // Campos de fecha del hito actual
      const fechasHitoActual: Record<string, string> = {
        'practica1_estado':      'practica1_fecha_termino',
        'informe_elab_estado':   'informe_elab_fecha_termino',
        'informe_rev_estado':    'informe_rev_fecha_termino',
        'eval_empresa_estado':   'eval_empresa_fecha_termino',
        'comite_carrera_estado': 'comite_carrera_fecha_termino',
        'envioreg_estado':       'envioreg_fecha_termino',
      };

      // Campos de fecha del hito siguiente
      const fechasSiguienteHito: Record<string, { inicio: string; termino: string }> = {
        'practica1_estado':      { inicio: 'informe_elab_fecha_inicio',   termino: 'informe_elab_fecha_termino'   },
        'informe_elab_estado':   { inicio: 'informe_rev_fecha_inicio',    termino: 'informe_rev_fecha_termino'    },
        'informe_rev_estado':    { inicio: 'eval_empresa_fecha_inicio',   termino: 'eval_empresa_fecha_termino'   },
        'eval_empresa_estado':   { inicio: 'comite_carrera_fecha_inicio', termino: 'comite_carrera_fecha_termino' },
        'comite_carrera_estado': { inicio: 'envioreg_fecha_inicio',       termino: 'envioreg_fecha_termino'       },
      };

      // 1. Marcar fecha_termino del hito actual como hoy (solo si aún no está seteada)
      const terminoActual = fechasHitoActual[campo];
      if (terminoActual) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE seguimiento_practica SET \`${terminoActual}\` = COALESCE(\`${terminoActual}\`, ?)
           WHERE alumno_id = ? AND practica_num = ?`,
          fmtDate(hoy), alumno_id, practica_num
        );
      }

      // 2. Rellenar inicio y termino del siguiente hito (mañana + duración estimada)
      const sigFechas = fechasSiguienteHito[campo];
      if (sigFechas && duracionSiguiente[campo]) {
        const fechaTerminoSig = new Date(manana);
        fechaTerminoSig.setDate(manana.getDate() + duracionSiguiente[campo]);
        await this.prisma.$executeRawUnsafe(
          `UPDATE seguimiento_practica
           SET \`${sigFechas.inicio}\`  = COALESCE(\`${sigFechas.inicio}\`,  ?),
               \`${sigFechas.termino}\` = COALESCE(\`${sigFechas.termino}\`, ?)
           WHERE alumno_id = ? AND practica_num = ?`,
          fmtDate(manana), fmtDate(fechaTerminoSig), alumno_id, practica_num
        );
      }
      // ── Fin auto-relleno ───────────────────────────────────────────────────
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
        const titulo  = valor === 2 ? '✅ Hito aprobado' : '❌ Hito no aprobado';
        const mensaje = valor === 2
          ? `Tu hito "${hitoLabels[campo]}" fue aprobado. ¡Sigue adelante!`
          : `Tu hito "${hitoLabels[campo]}" fue marcado como reprobado/excedido.`;
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notificaciones_alumno (alumno_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)`,
          alumno_id, tipo, titulo, mensaje,
        );
      }
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

    return { valido: false, mensaje: 'El código no corresponde a ningún documento registrado.' };
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
    await this.findOne(id);

    if (!HITOS.includes(hito)) {
      throw new BadRequestException('Hito inválido');
    }

    const esUltimoHito = hito === HITOS[HITOS.length - 1];

    return this.prisma.seguimiento_practica.update({
      where: { id },
      data: {
        [hito]: ESTADO.APROBADO,
        ...(esUltimoHito ? { estado_final_practica: 1 } : {}),
        ...datos,
      },
    });
  }

  async marcarExcedido(id: number, hito: string) {
    await this.findOne(id);

    if (!HITOS.includes(hito)) {
      throw new BadRequestException('Hito inválido');
    }

    return this.prisma.seguimiento_practica.update({
      where: { id },
      data: { [hito]: ESTADO.EXCEDIDO },
    });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const result = await this.prisma.seguimiento_practica.update({
      where: { id },
      data,
    });

    if (data.informe_rev_profesor_id) {
      try {
        const profesorId = Number(data.informe_rev_profesor_id);
        // usuarios.profesor_id → profesores.id (la relación va de usuarios hacia profesores)
        const rows = await this.prisma.$queryRaw<any[]>`
          SELECT u.id AS usuario_id, al.nombres, al.apellido1, al.rut
          FROM profesores p
          JOIN usuarios u  ON u.profesor_id  = p.id
          JOIN seguimiento_practica sp ON sp.id = ${id}
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
            usuario_id, id,
            `Debes revisar el informe de ${nombres} ${apellido1} (RUT: ${rut})`,
            id, id, usuario_id
          );
        }
      } catch (e) {
        console.error('[update] Error al crear notificación de profesor:', e);
      }
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
      await this.prisma.$executeRawUnsafe(
        `UPDATE seguimiento_practica SET eval_empresa_estado = 1
         WHERE id = ? AND eval_empresa_estado = 0`, seguimientoId);

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

    // Aprobar hito 4 automáticamente
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica
       SET eval_empresa_estado = 2,
           eval_empresa_fecha_termino = COALESCE(eval_empresa_fecha_termino, ?)
       WHERE id = ?`, hoy, seguimientoId);

    // Avanzar hito 5 (comité de carrera) a pendiente
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET comite_carrera_estado = 1
       WHERE id = ? AND COALESCE(comite_carrera_estado, 0) = 0`, seguimientoId);

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
    // Avanzar hito 3 (revisión informe) a pendiente si aún no está activo
    await this.prisma.$executeRawUnsafe(
      `UPDATE seguimiento_practica SET informe_rev_estado = 1
       WHERE id = ? AND COALESCE(informe_rev_estado, 0) = 0`, seguimiento_id);
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

      const alumno = await this.prisma.alumnos.findFirst({ where: { rut } });
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
}
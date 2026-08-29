import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ImageRun, Header
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

@Injectable()
export class GeneradoresService {
  constructor(private prisma: PrismaService) {}

  async getDatosSeguimiento(seguimiento_id: number) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.practica_num,
        sp.practica1_fecha_inicio,
        sp.practica1_fecha_termino,
        sp.practica1_empresa,
        sp.practica1_supervisor,
        sp.practica1_horas_sem,
        sp.practica1_horas_tot,
        sp.herramientas,
        sp.carta_solicitud,
        e.nombre AS empresa_nombre,
        CONCAT(p.nombre, ' ', p.apellido1, ' ', COALESCE(p.apellido2,'')) AS profesor_nombre
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      LEFT JOIN profesores p ON p.id = sp.informe_rev_profesor_id
      WHERE sp.id = ${seguimiento_id}
      LIMIT 1
    `;
    return result[0] ?? null;
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '---';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearFechaLarga(fecha: any): string {
    if (!fecha) return '';
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const d = new Date(fecha);
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }
    async generarActa(seguimiento_id: number, calificacion: string, semestre: string, registradora: string): Promise<Buffer> {
        const d = await this.getDatosSeguimiento(seguimiento_id);
        if (!d) throw new Error('Seguimiento no encontrado');

        const nombre = `${d.nombres} ${d.apellido1} ${d.apellido2 ?? ''}`.trim().toUpperCase();
        const practica = d.practica_num == 1 ? 'PRÁCTICA I' : 'PRÁCTICA II';
        const empresa = d.empresa_nombre || d.practica1_empresa || 'No registrado';
        const supervisor = d.practica1_supervisor || 'No registrado';
        const profesor = d.profesor_nombre?.trim() || 'No registrado';
        const jefeEfectivo = await this.getJefeCarreraEfectivo();
        const jefeCarrera = jefeEfectivo
          ? `${jefeEfectivo.nombre} ${jefeEfectivo.apellido1} ${jefeEfectivo.apellido2 ?? ''}`.trim().toUpperCase()
          : 'HUMBERTO URRUTIA LÓPEZ';
        const fechaInicio = this.formatearFecha(d.practica1_fecha_inicio);
        const fechaTerm = this.formatearFecha(d.practica1_fecha_termino);

        const labelFont = { bold: true, size: 22, font: 'Century Gothic' };
        const valueFont = { size: 22, font: 'Century Gothic' };
        const blueFont  = { size: 22, font: 'Century Gothic', color: '0563C1' };

        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const solidBorder = { style: BorderStyle.SINGLE, size: 8, color: '000000' };

        const filas = [
            { label: ' PRÁCTICA',                  valor: practica,       azul: false },
            { label: ' CARRERA',                   valor: ' INGENIERÍA CIVIL EN COMPUTACIÓN E INFORMÁTICA', azul: false },
            { label: ' NOMBRE ALUMNO',             valor: nombre,         azul: false },
            { label: ' R.U.T.',                    valor: d.rut,          azul: false },
            { label: ' LUGAR DE PRÁCTICA',         valor: empresa,        azul: false },
            { label: ' SUPERVISOR Y EVALUADOR',    valor: supervisor,     azul: false },
            { label: ' ACADÉMICO REVISOR INFORME', valor: profesor,       azul: false },
            { label: ' FECHA DE INICIO',           valor: fechaInicio,    azul: true  },
            { label: ' FECHA DE TÉRMINO',          valor: fechaTerm,      azul: true  },
            { label: ' CALIFICACIÓN',              valor: calificacion,   azul: true  },
            { label: ' SEMESTRE ACADÉMICO',        valor: semestre,       azul: true  },
        ];

        // Logos
        const logoUTAPath  = 'C:/xampp/htdocs/api/uploads/logos/uta_linea.png';
        const logoICCIPath = 'C:/xampp/htdocs/api/uploads/logos/logo_icci.png';
        const logoUTAData  = fs.existsSync(logoUTAPath)  ? fs.readFileSync(logoUTAPath)  : null;
        const logoICCIData = fs.existsSync(logoICCIPath) ? fs.readFileSync(logoICCIPath) : null;

        // Fila 1 — encabezado con logos (1 celda que abarca las 2 columnas)
        const filaEncabezado = new TableRow({
            height: { value: 900, rule: 'atLeast' as any },
            children: [
            new TableCell({
                columnSpan: 2,
                borders: {
                top: solidBorder, bottom: solidBorder,
                left: solidBorder, right: solidBorder,
                },
                margins: { top: 100, bottom: 100, left: 200, right: 200 },
                children: [
                new Table({
                    width: { size: 9000, type: WidthType.DXA },
                    alignment: AlignmentType.CENTER,
                    borders: {
                    top: noBorder, bottom: noBorder,
                    left: noBorder, right: noBorder,
                    },
                    rows: [
                    new TableRow({
                        children: [
                        // Logo UTA izquierda
                        new TableCell({
                            width: { size: 1800, type: WidthType.DXA },
                            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                            children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: logoUTAData ? [new ImageRun({
                                data: logoUTAData,
                                transformation: { width: 75, height: 58 },
                                type: 'png',
                            })] : [new TextRun({ text: '' })],
                            })],
                        }),
                        // Título centro
                        new TableCell({
                            width: { size: 5400, type: WidthType.DXA },
                            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                            children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 60, after: 40 },
                                children: [new TextRun({ text: 'ACTA DE CALIFICACIÓN FINAL', bold: true, size: 24, font: 'Century Gothic' })],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: 'PRÁCTICA PROFESIONAL', bold: true, size: 24, font: 'Century Gothic' })],
                            }),
                            ],
                        }),
                        // Logo ICCI derecha
                        new TableCell({
                            width: { size: 1800, type: WidthType.DXA },
                            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                            children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: logoICCIData ? [new ImageRun({
                                data: logoICCIData,
                                transformation: { width: 75, height: 58 },
                                type: 'png',
                            })] : [new TextRun({ text: '' })],
                        })],
                    }),
                    ],
                }),
                ],
            }),
            ],
        }),
        ],
    });

    // Filas de datos — 2 columnas
    const filasData = filas.map((fila, idx) => {
        const esLast = idx === filas.length - 1;
        const borderBot = esLast ? solidBorder : noBorder;

        return new TableRow({
        height: { value: 550, rule: 'atLeast' as any },
        children: [
            new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            borders: {
                top: noBorder, bottom: borderBot,
                left: solidBorder, right: solidBorder,
            },
            margins: { top: 120, bottom: 120, left: 250, right: 250 },
            children: [new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: fila.label, ...labelFont })],
            })],
            }),
            new TableCell({
            width: { size: 5700, type: WidthType.DXA },
            borders: {
                top: noBorder, bottom: borderBot,
                left: noBorder, right: solidBorder,
            },
            margins: { top: 120, bottom: 120, left: 250, right: 250 },
            children: [new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: fila.valor, ...(fila.azul ? blueFont : valueFont) })],
            })],
            }),
        ],
        });
    });

    const doc = new Document({
        sections: [{
        properties: {
            page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 600, bottom: 500, left: 800, right: 800 },
            },
        },
        children: [
            // Tabla principal con encabezado + datos
            new Table({
            width: { size: 9200, type: WidthType.DXA },
            alignment: AlignmentType.CENTER,
            rows: [filaEncabezado, ...filasData],
            }),
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            new Paragraph({ 
                spacing: { before: 2000 }, // ← ajusta este número
                children: [new TextRun({ text: '' })] 
            }),
            // Firmas fuera de la tabla
            new Table({
            width: { size: 9200, type: WidthType.DXA },
            alignment: AlignmentType.CENTER,
            borders: {
                top: noBorder, bottom: noBorder,
                left: noBorder, right: noBorder,
            },
            rows: [
                new TableRow({
                children: [
                    new TableCell({
                    width: { size: 4600, type: WidthType.DXA },
                    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                    children: [
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '_____________________________', font: 'Century Gothic', size: 22 })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: jefeCarrera, bold: true, font: 'Century Gothic', size: 24 })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jefe de Carrera ICCI', font: 'Century Gothic', size: 22 })] }),
                    ],
                    }),
                    new TableCell({
                    width: { size: 4600, type: WidthType.DXA },
                    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                    children: [
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '_____________________________', font: 'Century Gothic', size: 22 })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: registradora.toUpperCase(), bold: true, font: 'Century Gothic', size: 24 })] }),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Registradora', font: 'Century Gothic', size: 22 })] }),
                    ],
                    }),
                ],
                }),
            ],
            }),
        ],
        }],
    });

    return await Packer.toBuffer(doc);
    }

  async getProfesorPorRol(rol: string): Promise<{ nombre: string; apellido1: string; apellido2: string | null; correo: string | null } | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.nombre, p.apellido1, p.apellido2, p.correo
      FROM usuarios u
      JOIN profesores p ON p.id = u.profesor_id
      WHERE u.rol = ${rol}
      ORDER BY u.id DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  // Prioriza al subrogante activo (designado por secretaría cuando el jefe de
  // carrera no puede firmar) sobre el jefe de carrera real; mismo shape que
  // getProfesorPorRol para ser un reemplazo directo en los call sites existentes.
  async getJefeCarreraEfectivo(): Promise<{ nombre: string; apellido1: string; apellido2: string | null; correo: string | null } | null> {
    const sub = await this.prisma.subrogancias.findFirst({
      where: { activo: 1, rol_suplido: 'jefe_carrera' },
      include: { profesor: true },
    });
    if (sub?.profesor) {
      return { nombre: sub.profesor.nombre, apellido1: sub.profesor.apellido1, apellido2: sub.profesor.apellido2, correo: sub.profesor.correo };
    }
    return this.getProfesorPorRol('jefe_carrera');
  }

  // Análogo a getJefeCarreraEfectivo() pero para el director de departamento
  // (designado por secretaría DICI).
  async getDirectorDepartamentoEfectivo(): Promise<{ nombre: string; apellido1: string; apellido2: string | null; correo: string | null } | null> {
    const sub = await this.prisma.subrogancias.findFirst({
      where: { activo: 1, rol_suplido: 'director_departamento' },
      include: { profesor: true },
    });
    if (sub?.profesor) {
      return { nombre: sub.profesor.nombre, apellido1: sub.profesor.apellido1, apellido2: sub.profesor.apellido2, correo: sub.profesor.correo };
    }
    return this.getProfesorPorRol('director_departamento');
  }

  formatearFechaCartaOficial(fecha: Date): string {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[fecha.getMonth()]} ${String(fecha.getDate()).padStart(2, '0')} de ${fecha.getFullYear()}`;
  }

  async generarListaProfesorEvaluador(
    seguimientoIds: number[], creadoPor: string, numeroCarta: string,
  ): Promise<{ buffer: Buffer; codigo: string }> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT a.nombres, a.apellido1, a.apellido2, a.rut, sp.practica_num,
             COALESCE(e.nombre, sp.practica1_empresa) AS empresa
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE sp.id IN (${Prisma.join(seguimientoIds)})
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;

    const [director, jefe] = await Promise.all([
      this.getDirectorDepartamentoEfectivo(),
      this.getJefeCarreraEfectivo(),
    ]);
    const nombreCompleto = (p: { nombre: string; apellido1: string; apellido2: string | null } | null) =>
      p ? `${p.nombre} ${p.apellido1} ${p.apellido2 ?? ''}`.trim() : null;
    const directorNombre = nombreCompleto(director)?.toUpperCase() || 'DIRECTOR(A) DE DEPARTAMENTO';
    const jefeNombre      = nombreCompleto(jefe)?.toUpperCase() || 'JEFE DE CARRERA ICCI';

    const fechaActual = this.formatearFechaCartaOficial(new Date());
    const romanos: Record<number, string> = { 1: 'I', 2: 'II' };
    const numsPractica = [...new Set(rows.map(r => Number(r.practica_num)))].sort((a, b) => a - b);
    const practicaTexto = numsPractica.map(n => romanos[n] ?? String(n)).join(' y ');

    // Código de verificación: determinístico según el N° de carta y el conjunto de alumnos,
    // comprobable luego en /verificar-certificado (reemplaza a la firma del jefe de carrera).
    const idsOrdenados = [...seguimientoIds].sort((a, b) => a - b).join(',');
    const hash   = require('crypto').createHash('md5').update(`sol_prof_${numeroCarta}_${idsOrdenados}`).digest('hex');
    const codigo = hash.substring(0, 12).toUpperCase();
    const codigoDisplay = `${codigo.substring(0, 4)}-${codigo.substring(4, 8)}-${codigo.substring(8, 12)}`;

    const bodyFont  = { size: 20, font: 'Century Gothic' };
    const headFont  = { size: 16, font: 'Century Gothic' };
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const headerCell = (text: string) => new TableCell({
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, ...bodyFont })] })],
    });
    const dataCell = (text: string) => new TableCell({
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, ...bodyFont })] })],
    });

    const filas = rows.map(r => new TableRow({
      children: [
        dataCell(`${r.nombres} ${r.apellido1} ${r.apellido2 ?? ''}`.trim()),
        dataCell(`✓  ${r.empresa ?? '—'}`),
      ],
    }));

    // Logos del membrete (mismo criterio que el resto de documentos institucionales)
    const logosDir  = 'C:/xampp/htdocs/api/uploads/logos/';
    const logoUTAData  = fs.existsSync(logosDir + 'uta_linea.png') ? fs.readFileSync(logosDir + 'uta_linea.png') : null;
    const logoICCIData = fs.existsSync(logosDir + 'logo_icci.png') ? fs.readFileSync(logosDir + 'logo_icci.png') : null;
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    const membrete = new Table({
      width: { size: 9200, type: WidthType.DXA },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
                 insideHorizontal: noBorder, insideVertical: noBorder },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1300, type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [new Paragraph({
                children: logoUTAData ? [new ImageRun({ data: logoUTAData, transformation: { width: 45, height: 60 }, type: 'png' })] : [new TextRun({ text: '' })],
              })],
            }),
            new TableCell({
              width: { size: 5900, type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Universidad de Tarapacá', ...headFont })] }),
                new Paragraph({ children: [new TextRun({ text: 'Facultad de Ingeniería', ...headFont })] }),
                new Paragraph({ children: [new TextRun({ text: 'Jefatura de Carrera de Ingeniería en Computación e Informática', bold: true, ...headFont })] }),
              ],
            }),
            new TableCell({
              width: { size: 2000, type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: logoICCIData ? [new ImageRun({ data: logoICCIData, transformation: { width: 130, height: 45 }, type: 'png' })] : [new TextRun({ text: '' })],
              })],
            }),
          ],
        }),
      ],
    });

    const doc = new Document({
      sections: [{
        children: [
          membrete,
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } },
            spacing: { after: 400 },
            children: [new TextRun({ text: '' })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Arica, ${fechaActual}.`, ...bodyFont })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: `ICCI N° ${numeroCarta}`, bold: true, ...bodyFont })],
          }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Señor', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: directorNombre, bold: true, ...bodyFont })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Director', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Departamento de Ing. Computación e Informática', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Presente', underline: {}, ...bodyFont })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'De mi consideración:', ...bodyFont })] }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [new TextRun({
              text: `A través de la presente me permito solicitar a usted, tenga a bien, asignar académicos del Departamento de Ingeniería en Computación e Informática para revisar Informes de práctica profesional ${practicaTexto} de los alumnos indicados a continuación:`,
              ...bodyFont,
            })],
          }),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
                       insideHorizontal: cellBorder, insideVertical: cellBorder },
            rows: [
              new TableRow({ children: [headerCell('ALUMNO (A)'), headerCell('LUGAR DE PRÁCTICA')] }),
              ...filas,
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 300, after: 300 },
            children: [
              new TextRun({ text: 'Se ', ...bodyFont }),
              new TextRun({ text: 'adjunta Formulario de Revisión Informe de Práctica Profesional', bold: true, ...bodyFont }),
              new TextRun({ text: ' junto con los ', ...bodyFont }),
              new TextRun({ text: 'Informes de Práctica Profesional', bold: true, ...bodyFont }),
              new TextRun({ text: ' entregados por los estudiantes.', ...bodyFont }),
            ],
          }),
          new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: 'Atentamente,', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: '' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: jefeNombre, bold: true, ...bodyFont })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jefe de Carrera', ...bodyFont })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'Ingeniería Civil en Computación e Informática', ...bodyFont })] }),
          new Paragraph({
            children: [new TextRun({
              text: `Código de verificación: ${codigoDisplay}`,
              size: 18, font: 'Century Gothic', color: '555555',
            })],
          }),
          new Paragraph({
            children: [new TextRun({
              text: 'Este documento puede comprobarse en el sistema, en la sección "Verificar documento".',
              size: 16, italics: true, font: 'Century Gothic', color: '888888',
            })],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    const nombreArchivo = `Solicitud_Profesor_Evaluador_${codigo}.docx`;
    const carpeta   = 'C:/xampp/htdocs/uploads/solicitudes_profesor_evaluador';
    const rutaBD    = `uploads/solicitudes_profesor_evaluador/${nombreArchivo}`;
    try {
      fs.mkdirSync(carpeta, { recursive: true });
      fs.writeFileSync(path.join(carpeta, nombreArchivo), buffer);
    } catch (e) {
      console.error('[generarListaProfesorEvaluador] Error guardando archivo:', e);
    }

    const alumnosResumen  = rows.map(r => `${r.nombres} ${r.apellido1} ${r.apellido2 ?? ''}`.trim()).join(', ');
    const empresasResumen = [...new Set(rows.map(r => r.empresa).filter(Boolean))].join(', ');

    await this.prisma.solicitudes_profesor_evaluador.upsert({
      where: { codigo },
      update: {
        seguimiento_ids: idsOrdenados,
        alumnos_resumen: alumnosResumen,
        empresas_resumen: empresasResumen || null,
        numero_carta: numeroCarta,
        creado_por: creadoPor,
        ruta_archivo: rutaBD,
      },
      create: {
        codigo,
        seguimiento_ids: idsOrdenados,
        alumnos_resumen: alumnosResumen,
        empresas_resumen: empresasResumen || null,
        numero_carta: numeroCarta,
        creado_por: creadoPor,
        ruta_archivo: rutaBD,
      },
    });

    // Deja registrada la carta de petición en el seguimiento de cada alumno solicitado
    await this.prisma.seguimiento_practica.updateMany({
      where: { id: { in: seguimientoIds } },
      data: { informe_rev_carta_peticion: numeroCarta },
    });

    return { buffer, codigo: codigoDisplay };
  }

  // Solicitudes ICCI (jefe de carrera) que incluyen a alguno de los seguimientos dados —
  // permite al director ver/enlazar el documento que originó la petición de evaluador.
  async listarSolicitudesIcci(seguimientoIds: number[]) {
    const rows = await this.prisma.solicitudes_profesor_evaluador.findMany({
      orderBy: { created_at: 'desc' },
    });
    return rows
      .filter(r => r.seguimiento_ids.split(',').map(Number).some(id => seguimientoIds.includes(id)))
      .map(r => ({
        id: r.id,
        codigo: r.codigo,
        numero_carta: r.numero_carta,
        fecha: r.created_at,
        ruta_archivo: r.ruta_archivo,
        alumnos_resumen: r.alumnos_resumen,
      }));
  }

  // Secretaría/jefe de carrera ICCI: última solicitud enviada, con el acta DICI
  // correlacionada (si secretaría DICI ya respondió) para que puedan ver el
  // estado sin tener que preguntar.
  async listarHistorialEvaluador() {
    const [solicitudes, actas] = await Promise.all([
      this.prisma.solicitudes_profesor_evaluador.findMany({ orderBy: { created_at: 'desc' }, take: 1 }),
      this.prisma.actas_academico_evaluador.findMany(),
    ]);
    return solicitudes.map(s => {
      const idsSolicitud = s.seguimiento_ids.split(',').map(Number);
      const acta = actas.find(a => a.seguimiento_ids.split(',').map(Number).some(id => idsSolicitud.includes(id)));
      return {
        id: s.id,
        codigo: s.codigo,
        numero_carta: s.numero_carta,
        fecha: s.created_at,
        ruta_archivo: s.ruta_archivo,
        alumnos_resumen: s.alumnos_resumen,
        acta: acta ? {
          codigo: acta.codigo,
          numero_dici: acta.numero_dici,
          fecha: acta.created_at,
          ruta_archivo: acta.ruta_archivo,
          alumnos_resumen: acta.alumnos_resumen,
        } : null,
      };
    });
  }

  private async resolverReferenciaIcci(seguimientoIds: number[]): Promise<string> {
    const rows = await this.prisma.solicitudes_profesor_evaluador.findMany({
      orderBy: { created_at: 'desc' },
    });
    const match = rows.find(r => r.seguimiento_ids.split(',').map(Number).some(id => seguimientoIds.includes(id)));
    if (match?.numero_carta) {
      return `ICCI N° ${match.numero_carta}, de fecha ${this.formatearFechaCartaOficial(match.created_at)}`;
    }
    return 'carta ICCI correspondiente';
  }

  async generarActaAcademicoEvaluador(
    seguimientoIds: number[], creadoPor: string, numeroDici: string,
  ): Promise<{ buffer: Buffer; codigo: string }> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT a.nombres, a.apellido1, a.apellido2,
             CONCAT(p.nombre, ' ', p.apellido1, ' ', COALESCE(p.apellido2, '')) AS academico
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      JOIN profesores p ON p.id = sp.informe_rev_profesor_id
      WHERE sp.id IN (${Prisma.join(seguimientoIds)})
      ORDER BY a.apellido1, a.apellido2, a.nombres
    `;
    if (rows.length === 0) throw new Error('Ninguno de los alumnos seleccionados tiene un académico evaluador asignado');

    const referencia = await this.resolverReferenciaIcci(seguimientoIds);
    const jefe = await this.getJefeCarreraEfectivo();
    const nombreCompleto = (p: { nombre: string; apellido1: string; apellido2: string | null } | null) =>
      p ? `${p.nombre} ${p.apellido1} ${p.apellido2 ?? ''}`.trim() : null;
    const jefeNombre     = nombreCompleto(jefe)?.toUpperCase() || 'JEFE DE CARRERA ICCI';
    const director       = await this.getDirectorDepartamentoEfectivo();
    const directorNombre = nombreCompleto(director)?.toUpperCase() || 'DIRECTOR(A) DE DEPARTAMENTO';

    const fechaActual = this.formatearFechaCartaOficial(new Date());

    // Código de verificación: determinístico según el N° DICI y el conjunto de alumnos,
    // comprobable luego en /verificar-certificado (reemplaza a la firma del director).
    const idsOrdenados = [...seguimientoIds].sort((a, b) => a - b).join(',');
    const hash   = require('crypto').createHash('md5').update(`acta_academico_${numeroDici}_${idsOrdenados}`).digest('hex');
    const codigo = hash.substring(0, 12).toUpperCase();
    const codigoDisplay = `${codigo.substring(0, 4)}-${codigo.substring(4, 8)}-${codigo.substring(8, 12)}`;

    const bodyFont   = { size: 20, font: 'Century Gothic' };
    const headFont   = { size: 16, font: 'Century Gothic' };
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const headerCell = (text: string) => new TableCell({
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, ...bodyFont })] })],
    });
    const dataCell = (text: string) => new TableCell({
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, ...bodyFont })] })],
    });

    const filas = rows.map(r => new TableRow({
      children: [
        dataCell(`${r.nombres} ${r.apellido1} ${r.apellido2 ?? ''}`.trim()),
        dataCell(r.academico),
      ],
    }));

    // Logos del membrete DICI: logo genérico de facultad (izquierda) + logo del
    // Departamento de Ingeniería en Computación e Informática, que ya trae el texto (derecha)
    const logosDir     = 'C:/xampp/htdocs/api/uploads/logos/';
    const logoFacData  = fs.existsSync(logosDir + 'facultad_fixed.png') ? fs.readFileSync(logosDir + 'facultad_fixed.png') : null;
    const logoDiciData = fs.existsSync(logosDir + 'DICI_fixed.png') ? fs.readFileSync(logosDir + 'DICI_fixed.png') : null;
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    const membrete = new Table({
      width: { size: 9200, type: WidthType.DXA },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
                 insideHorizontal: noBorder, insideVertical: noBorder },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2600, type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [new Paragraph({
                children: logoFacData ? [new ImageRun({ data: logoFacData, transformation: { width: 60, height: 60 }, type: 'png' })] : [new TextRun({ text: '' })],
              })],
            }),
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: logoDiciData ? [new ImageRun({ data: logoDiciData, transformation: { width: 150, height: 50 }, type: 'png' })] : [new TextRun({ text: '' })],
              })],
            }),
          ],
        }),
      ],
    });

    const doc = new Document({
      sections: [{
        children: [
          membrete,
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } },
            spacing: { after: 400 },
            children: [new TextRun({ text: '' })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Arica, ${fechaActual}.`, ...bodyFont })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: `DICI N° ${numeroDici}`, bold: true, ...bodyFont })],
          }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Señor', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: jefeNombre, bold: true, ...bodyFont })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Jefe de Carrera', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Ingeniería Civil en Computación e Informática', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Presente', underline: {}, ...bodyFont })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'De mi consideración:', ...bodyFont })] }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [new TextRun({
              text: `En respuesta a su carta ${referencia}, le informo que el (los) académico (s) designado (s) para evaluar informe de práctica:`,
              ...bodyFont,
            })],
          }),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
                       insideHorizontal: cellBorder, insideVertical: cellBorder },
            rows: [
              new TableRow({ children: [headerCell('ALUMNO (A)'), headerCell('ACADÉMICO EVALUADOR')] }),
              ...filas,
            ],
          }),
          new Paragraph({ spacing: { before: 400, after: 600 }, children: [new TextRun({ text: 'Sin otro particular, le saluda cordialmente,', ...bodyFont })] }),
          new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: '' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: directorNombre, bold: true, ...bodyFont })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'Director', ...bodyFont })] }),
          new Paragraph({
            children: [new TextRun({
              text: `Código de verificación: ${codigoDisplay}`,
              size: 18, font: 'Century Gothic', color: '555555',
            })],
          }),
          new Paragraph({
            children: [new TextRun({
              text: 'Este documento puede comprobarse en el sistema, en la sección "Verificar documento".',
              size: 16, italics: true, font: 'Century Gothic', color: '888888',
            })],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    const nombreArchivo = `Acta_Academico_Evaluador_${codigo}.docx`;
    const carpeta   = 'C:/xampp/htdocs/uploads/actas_academico_evaluador';
    const rutaBD    = `uploads/actas_academico_evaluador/${nombreArchivo}`;
    try {
      fs.mkdirSync(carpeta, { recursive: true });
      fs.writeFileSync(path.join(carpeta, nombreArchivo), buffer);
    } catch (e) {
      console.error('[generarActaAcademicoEvaluador] Error guardando archivo:', e);
    }

    const alumnosResumen = rows.map(r => `${r.nombres} ${r.apellido1} ${r.apellido2 ?? ''}`.trim() + ' → ' + r.academico).join(', ');

    await this.prisma.actas_academico_evaluador.upsert({
      where: { codigo },
      update: { seguimiento_ids: idsOrdenados, alumnos_resumen: alumnosResumen, numero_dici: numeroDici, creado_por: creadoPor, ruta_archivo: rutaBD },
      create: { codigo, seguimiento_ids: idsOrdenados, alumnos_resumen: alumnosResumen, numero_dici: numeroDici, creado_por: creadoPor, ruta_archivo: rutaBD },
    });

    // Deja registrada la carta de asignación en el seguimiento de cada alumno incluido en el acta
    await this.prisma.seguimiento_practica.updateMany({
      where: { id: { in: seguimientoIds } },
      data: { informe_rev_carta_asignacion: numeroDici },
    });

    return { buffer, codigo: codigoDisplay };
  }

  // Genera el certificado solo si todavía no existe uno para ese alumno/práctica
  // (evita regenerar -y pisar la fecha de creación- cada vez que se vuelve a
  // recalcular el estado final de una práctica ya aprobada).
  async generarCertificadoSiFalta(alumno_rut: string, practica_num: number, creado_por: string) {
    const existente = await this.prisma.certificados.findFirst({
      where: { alumno_rut, practica_num },
    });
    if (existente) return { ok: true, yaExistia: true, id: existente.id };
    return this.generarCertificado(alumno_rut, practica_num, creado_por);
  }

  async generarCertificado(alumno_rut: string, practica_num: number, creado_por: string): Promise<{ ok: boolean; archivo: string; id: number }> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.id AS alumno_id,
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.practica_num,
        sp.practica1_fecha_inicio,
        sp.practica1_fecha_termino,
        sp.practica1_horas_tot,
        sp.herramientas,
        COALESCE(e.nombre, sp.practica1_empresa) AS empresa_nombre
      FROM alumnos a
      JOIN seguimiento_practica sp ON sp.alumno_id = a.id AND sp.practica_num = ${practica_num}
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE a.rut = ${alumno_rut}
      LIMIT 1
    `;
    const d = rows[0];
    if (!d) throw new Error('No se encontró práctica aprobada para este alumno');

    const alumnoId = Number(d.alumno_id);
    const apellidos = `${d.apellido1} ${d.apellido2 ?? ''}`.trim();
    const nombreCompleto = `${d.nombres} ${apellidos}`.trim().toUpperCase();
    const empresa = (d.empresa_nombre || '—').toUpperCase();

    // Código verificador (misma lógica que PHP)
    const rutDigits = alumno_rut.replace(/[^0-9]/g, '');
    const semilla = `${alumnoId}${practica_num}${rutDigits}`;
    const hashHex = require('crypto').createHash('md5').update(semilla).digest('hex');
    const crcNum  = Math.abs(parseInt(hashHex.substring(0, 8), 16)) % 1000000000;
    const codigo  = String(crcNum).padStart(9, '0');
    const display = `${codigo.substring(0,3)}-${codigo.substring(3,6)}-${codigo.substring(6,9)}`;

    const meses = ['','enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const hoy = new Date();
    const fechaEmision = `Arica, ${hoy.getDate()} de ${meses[hoy.getMonth()+1]} de ${hoy.getFullYear()}`;
    const fmtFecha = (f: any) => {
      if (!f) return '—';
      const dt = new Date(f);
      return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`;
    };

    const tools: string[] = (d.herramientas ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean);

    // Eliminar certificados anteriores del mismo alumno/práctica
    const anteriores = await this.prisma.certificados.findMany({ where: { alumno_rut, practica_num } });
    for (const ant of anteriores) {
      const ruta = path.join('C:/xampp/htdocs', ant.ruta_archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }
    await this.prisma.certificados.deleteMany({ where: { alumno_rut, practica_num } });

    // ── Medidas (igual que PHP, convertidas de mm a pt) ──────
    const mm = (v: number) => v * 2.8346;
    const pageW  = mm(279.4);  // LETTER landscape
    const pageH  = mm(215.9);
    const margen = mm(15);
    const pad    = mm(20);
    const rectX  = margen;
    const rectY  = margen;
    const rectW  = pageW - margen * 2;
    const rectH  = pageH - margen * 2;
    const cx     = rectX + pad;
    const cy     = rectY + mm(15);
    const cw     = rectW - pad * 2;
    const ch     = rectH - pad * 2;
    const mx     = cx + mm(4);
    const rw     = cw - mm(8);
    const cenX   = cx + cw / 2;

    const blue          = '#1E3F7A';
    const orange        = '#FC7201';
    const grayDark      = '#505050';
    const grayLight     = '#8C8C8C';
    const lightBlue     = '#B4C8E6';
    const lightBlueText = '#6482B4';
    const greenFill     = '#EAF5DC';
    const greenBorder   = '#3B7811';
    const greenText     = '#2D640A';

    const rutBD       = alumno_rut.replace(/[^0-9kK]/gi, '');
    const nombreArch  = `Certificado_P${practica_num}_${rutBD}`;
    const archivo     = `${nombreArch}.pdf`;
    const carpeta     = 'C:/xampp/htdocs/storage/certificados';
    const rutaBD      = `storage/certificados/${archivo}`;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [pageW, pageH], margin: 0, autoFirstPage: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        try {
          fs.mkdirSync(carpeta, { recursive: true });
          fs.writeFileSync(path.join(carpeta, archivo), buffer);
        } catch (e) { console.error('Error guardando certificado:', e); }

        const record = await this.prisma.certificados.create({
          data: { nombre: nombreArch, alumno_rut, practica_num, creado_por, ruta_archivo: rutaBD }
        });
        resolve({ ok: true, archivo: rutaBD, id: record.id });
      });
      doc.on('error', reject);

      // ── 1. Marco azul ──────────────────────────────────────
      doc.strokeColor(blue).lineWidth(mm(0.5));
      doc.moveTo(rectX, rectY).lineTo(rectX + rectW, rectY)
         .moveTo(rectX, rectY + rectH).lineTo(rectX + rectW, rectY + rectH)
         .moveTo(rectX, rectY).lineTo(rectX, rectY + rectH)
         .moveTo(rectX + rectW, rectY).lineTo(rectX + rectW, rectY + rectH)
         .stroke();

      // ── 2. Código de verificación (margen derecho, vertical) ─
      const codeX_mm = 15 + 249.4 + 2;   // = 266.4
      const codeY_mm = 215.9 / 2;         // = 107.95
      const pivotX   = mm(codeX_mm + 5);  // = mm(271.4)
      const pivotY   = mm(codeY_mm);

      doc.save();
      doc.rotate(-90, { origin: [pivotX, pivotY] });
      doc.fillColor(blue).font('Helvetica-Bold').fontSize(9);
      doc.text(display, mm(codeX_mm - 10), mm(codeY_mm - 4), { width: mm(20), align: 'center', lineBreak: false });
      doc.restore();

      doc.save();
      doc.rotate(-90, { origin: [pivotX, mm(codeY_mm + 34)] });
      doc.fillColor(lightBlueText).font('Helvetica').fontSize(5.5);
      doc.text('CÓDIGO DE VERIFICACIÓN', mm(codeX_mm - 20), mm(codeY_mm + 30), { width: mm(40), align: 'center', lineBreak: false });
      doc.restore();

      // ── 3. Logos ───────────────────────────────────────────
      const logosDir = 'C:/xampp/htdocs/api/uploads/logos/';
      try {
        const p = logosDir + 'facultad_fixed.png';
        if (fs.existsSync(p)) doc.image(p, cx + mm(2), cy, { fit: [mm(25), mm(20)] });
      } catch (_) {}
      try {
        const p = logosDir + 'DICI_fixed.png';
        if (fs.existsSync(p)) doc.image(p, cenX - mm(35), cy + mm(2), { fit: [mm(70), mm(20)] });
      } catch (_) {}
      try {
        const p = logosDir + 'logo_icci.png';
        if (fs.existsSync(p)) doc.image(p, cx + cw - mm(52), cy + mm(1), { fit: [mm(50), mm(20)] });
      } catch (_) {}

      // ── 4. Contenido ───────────────────────────────────────
      let y = cy + mm(30);

      doc.fillColor(blue).font('Helvetica').fontSize(8);
      doc.text('CERTIFICADO DE PRÁCTICA PROFESIONAL', cx, y, { width: cw, align: 'center', lineBreak: false });
      y += mm(6);

      doc.fillColor(blue).font('Helvetica-Bold').fontSize(17);
      doc.text(`Práctica Profesional N° ${practica_num}`, cx, y, { width: cw, align: 'center', lineBreak: false });
      y += mm(8);

      // Línea decorativa naranja bajo el título
      doc.strokeColor(orange).lineWidth(mm(0.4));
      doc.moveTo(cx + mm(10), y).lineTo(cx + cw - mm(10), y).stroke();
      y += mm(10);

      doc.fillColor(grayDark).font('Helvetica').fontSize(11);
      doc.text('Se entrega el presente certificado a:', cx, y, { width: cw, align: 'center', lineBreak: false });
      y += mm(9);

      doc.fillColor(blue).font('Helvetica-Bold').fontSize(16);
      doc.text(nombreCompleto, cx, y, { width: cw, align: 'center', lineBreak: false });
      y += mm(6);

      doc.fillColor(grayLight).font('Helvetica').fontSize(9);
      doc.text(`RUT: ${alumno_rut}`, cx, y, { width: cw, align: 'center', lineBreak: false });
      y += mm(9);

      // Línea corta naranja
      doc.strokeColor(orange).lineWidth(mm(0.4));
      doc.moveTo(cenX - mm(45), y).lineTo(cenX + mm(45), y).stroke();
      y += mm(9);

      doc.fillColor(grayDark).font('Helvetica').fontSize(11);
      doc.text(
        `por haber completado y aprobado su Práctica Profesional N° ${practica_num} en la empresa`,
        cx, y, { width: cw, align: 'center', lineBreak: false }
      );
      y += mm(8);

      doc.fillColor(blue).font('Helvetica-Bold').fontSize(14);
      doc.text(empresa, cx, y, { width: cw, align: 'center', lineBreak: false });
      y += mm(8);

      doc.fillColor(grayDark).font('Helvetica').fontSize(10);
      doc.text(
        `durante el período ${fmtFecha(d.practica1_fecha_inicio)} al ${fmtFecha(d.practica1_fecha_termino)}, completando un total de ${d.practica1_horas_tot ?? '—'} horas.`,
        cx, y, { width: cw, align: 'center', lineBreak: false }
      );
      y += mm(12);

      // ── 5. Herramientas ────────────────────────────────────
      if (tools.length > 0) {
        doc.strokeColor(lightBlue).lineWidth(mm(0.25));
        doc.moveTo(mx, y).lineTo(cx + cw - mm(4), y).stroke();
        y += mm(6);

        doc.fillColor(blue).font('Helvetica-Bold').fontSize(9);
        doc.text('Herramientas utilizadas:', mx, y, { width: rw, align: 'left', lineBreak: false });
        y += mm(5.5);

        doc.fillColor('#282828').font('Helvetica').fontSize(9);
        if (tools.length <= 6) {
          for (const tool of tools) {
            doc.text(`• ${tool}`, mx + mm(3), y, { width: rw, align: 'left', lineBreak: false });
            y += mm(5);
          }
        } else {
          const mitad = Math.ceil(tools.length / 2);
          const startY = y;
          for (let i = 0; i < mitad; i++) {
            doc.text(`• ${tools[i]}`, mx + mm(3), startY + i * mm(5), { width: rw / 2, align: 'left', lineBreak: false });
          }
          for (let i = mitad; i < tools.length; i++) {
            doc.text(`• ${tools[i]}`, mx + mm(3) + rw / 2, startY + (i - mitad) * mm(5), { width: rw / 2, align: 'left', lineBreak: false });
          }
          y = startY + mitad * mm(5);
        }
        y += mm(6);
      }

      // ── 6. Badge APROBADA ──────────────────────────────────
      const badgeW = mm(80);
      const badgeX = cenX - badgeW / 2;
      const badgeH = mm(9);
      doc.fillColor(greenFill).strokeColor(greenBorder).lineWidth(mm(0.4));
      doc.roundedRect(badgeX, y, badgeW, badgeH, mm(2)).fillAndStroke();
      doc.fillColor(greenText).font('Helvetica-Bold').fontSize(10);
      doc.text('Estado práctica:  APROBADA', badgeX, y + mm(2), { width: badgeW, align: 'center', lineBreak: false });

      // ── 7. Fecha de emisión (pie) ──────────────────────────
      doc.fillColor('#969696').font('Helvetica').fontSize(8);
      doc.text(fechaEmision, cx, cy + ch - mm(6), { width: cw, align: 'center', lineBreak: false });

      doc.end();
    });
  }

  async generarInformeConfidencial(seguimiento_id: number): Promise<Buffer> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.practica_num,
        sp.practica1_fecha_inicio, sp.practica1_fecha_termino,
        sp.practica1_horas_sem,   sp.practica1_horas_tot,
        sp.practica1_supervisor,  sp.practica1_jefe,
        e.nombre      AS empresa_nombre,
        e.direccion   AS empresa_direccion,
        ee.criterio_asistencia,   ee.criterio_cantidad,
        ee.criterio_calidad,      ee.criterio_normativas,
        ee.criterio_aprendizaje,  ee.criterio_conocimientos,
        ee.criterio_habilidades,  ee.criterio_trabajo_equipo,
        ee.descripcion_trabajo,   ee.comentarios, ee.utilidad,
        ee.created_at AS eval_fecha
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      LEFT JOIN evaluacion_empresa ee ON ee.seguimiento_id = sp.id
      WHERE sp.id = ${seguimiento_id}
      ORDER BY ee.created_at DESC
      LIMIT 1
    `;
    const d = rows[0];
    if (!d) throw new Error('Seguimiento no encontrado');

    const mm    = (v: number) => v * 2.8346;
    const fmtF  = (f: any) => { if (!f) return '_______________'; const dt = new Date(f); return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`; };
    const alumno   = `${d.nombres} ${d.apellido1} ${d.apellido2 ?? ''}`.trim();
    const practica = Number(d.practica_num) === 1 ? 'Práctica I' : 'Práctica II';
    const logosDir = 'C:/xampp/htdocs/api/uploads/logos/';
    const logoUTA  = logosDir + 'uta_linea.png';
    const logoIcci = logosDir + 'logo_icci.png';

    const criterios: { label: string; opciones: { letra: string; texto: string }[]; campo: string }[] = [
      { label: 'Asistencia', campo: 'criterio_asistencia',
        opciones: [
          { letra: 'a', texto: 'Registro óptimo de asistencia' },
          { letra: 'b', texto: 'Asistencia satisfactoria' },
          { letra: 'c', texto: 'Fallas en la asistencia' },
        ]},
      { label: 'Cantidad de trabajo', campo: 'criterio_cantidad',
        opciones: [
          { letra: 'a', texto: 'Por encima del promedio' },
          { letra: 'b', texto: 'Alrededor del promedio' },
          { letra: 'c', texto: 'Por debajo del promedio' },
        ]},
      { label: 'Calidad de trabajo', campo: 'criterio_calidad',
        opciones: [
          { letra: 'a', texto: 'Mucha adaptación, cambia con más facilidad que el promedio' },
          { letra: 'b', texto: 'Satisfactoria adaptabilidad, cambia con la facilidad que lo hace el promedio' },
          { letra: 'c', texto: 'Adaptabilidad no satisfactoria, cambia con menos facilidad que el promedio' },
        ]},
      { label: 'Normativas', campo: 'criterio_normativas',
        opciones: [
          { letra: 'a', texto: 'Cumple con las normas' },
          { letra: 'b', texto: 'Viola algunas veces las normas' },
        ]},
      { label: 'Capacidad y Aprendizaje', campo: 'criterio_aprendizaje',
        opciones: [
          { letra: 'a', texto: 'Capacidad de aprendizaje por sobre el promedio, requiere poca enseñanza' },
          { letra: 'b', texto: 'Capacidad de aprendizaje de nivel medio, requiere enseñanza normal' },
          { letra: 'c', texto: 'Capacidad de aprendizaje por debajo del promedio, requiere mucha enseñanza' },
        ]},
      { label: 'Conocimientos', campo: 'criterio_conocimientos',
        opciones: [
          { letra: 'a', texto: 'Buen nivel, por sobre el promedio' },
          { letra: 'b', texto: 'Nivel satisfactorio o promedio' },
          { letra: 'c', texto: 'Nivel no satisfactorio, por debajo del promedio' },
        ]},
      { label: 'Habilidades', campo: 'criterio_habilidades',
        opciones: [
          { letra: 'a', texto: 'Mucha habilidad, destreza por sobre el promedio' },
          { letra: 'b', texto: 'Habilidad satisfactoria, destreza promedio' },
          { letra: 'c', texto: 'Habilidad no satisfactoria, destreza por debajo del promedio' },
        ]},
      { label: 'Actitud para trabajar en Equipo', campo: 'criterio_trabajo_equipo',
        opciones: [
          { letra: 'a', texto: 'Coopera voluntariamente y se ofrece a ayudar a los demás' },
          { letra: 'b', texto: 'Generalmente cooperativo' },
          { letra: 'c', texto: 'Trabaja mal con los demás' },
        ]},
    ];

    return new Promise<Buffer>((resolve, reject) => {
      const doc    = new PDFDocument({ margin: mm(18), size: 'A4', autoFirstPage: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const nombreArchivo = `informe_confidencial_${seguimiento_id}.pdf`;
        const destino = path.join('C:/xampp/htdocs/uploads/evaluaciones', nombreArchivo);
        const rutaBD  = `uploads/evaluaciones/${nombreArchivo}`;
        try {
          fs.mkdirSync(path.dirname(destino), { recursive: true });
          fs.writeFileSync(destino, buffer);
          await this.prisma.$executeRaw`
            UPDATE seguimiento_practica SET eval_empresa_archivo = ${rutaBD} WHERE id = ${seguimiento_id}
          `;
        } catch (e) {
          console.error('[generarInformeConfidencial] Error guardando archivo:', e);
        }
        resolve(buffer);
      });
      doc.on('error', reject);

      const lm     = mm(18);
      const pageW  = doc.page.width;
      const usable = pageW - lm * 2;

      const addHeader = () => {
        const hy = doc.y;
        try { if (fs.existsSync(logoUTA))  doc.image(logoUTA,  lm,                    hy, { fit: [mm(18), mm(14)] }); } catch (_) {}
        try { if (fs.existsSync(logoIcci)) doc.image(logoIcci, lm + usable - mm(30),  hy, { fit: [mm(28), mm(20)] }); } catch (_) {}
        doc.font('Helvetica').fontSize(7).fillColor('#000');
        doc.text('Jefatura de Carrera',                                     lm + mm(22), hy,         { width: usable - mm(56), align: 'left', lineBreak: false });
        doc.text('Departamento de Ingeniería en Computación e Informática', lm + mm(22), hy + mm(4), { width: usable - mm(56), align: 'left', lineBreak: false });
        doc.text('Facultad de Ingeniería',                                  lm + mm(22), hy + mm(8), { width: usable - mm(56), align: 'left', lineBreak: false });
        doc.text('Universidad de Tarapacá',                                 lm + mm(22), hy + mm(12),{ width: usable - mm(56), align: 'left', lineBreak: false });
        doc.moveTo(lm, hy + mm(22)).lineTo(lm + usable, hy + mm(22)).lineWidth(0.5).strokeColor('#000').stroke();
        doc.y = hy + mm(25);
      };

      const field = (label: string, value: string, y?: number) => {
        const yy = y ?? doc.y;
        doc.font('Helvetica').fontSize(10).fillColor('#000');
        doc.text(`${label}: `, lm + mm(10), yy, { continued: true });
        doc.font('Helvetica-Bold').text(value || '________________________________');
        doc.moveDown(0.3);
      };

      // ── Página 1 ──────────────────────────────────────────────────────
      addHeader();
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000');
      doc.text('INFORME CONFIDENCIAL ICCI', lm, doc.y, { width: usable, align: 'center' });
      doc.moveDown(1.5);

      doc.font('Helvetica').fontSize(10);
      doc.text('ALUMNO (A)  ', lm, doc.y, { continued: true });
      doc.font('Helvetica-Bold').text(alumno);
      doc.moveDown(0.5);
      doc.font('Helvetica').text('R.U.T.  :  ', lm, doc.y, { continued: true });
      doc.font('Helvetica-Bold').text(d.rut);
      doc.moveDown(1);

      doc.font('Helvetica').fontSize(9);
      doc.text('El presente informe se ciñe al formato de un cuestionario, en el cual se formulan preguntas para las que se ofrecen alternativas de respuestas y en el que además hay preguntas de respuestas abiertas para posibilitar una expresión más libre de sus importantes opiniones. Es obvio que insistamos en que sea contestado por el Jefe bajo cuyas órdenes directas estuvo el alumno en práctica. Para nuestros propósitos es esencial contar con opiniones y evaluaciones todo lo sinceras y objetivas que sea posible. Le rogamos emplee como patrón la referencia para juzgar al alumno-practicante, la conducta que normalmente exhibe el profesional joven que ha sido contratado para realizar funciones similares en su primer período de trabajo para la empresa. Recuerde que la información que Ud. nos proporcione es absolutamente confidencial.', lm, doc.y, { width: usable, align: 'justify' });
      doc.moveDown(1.2);

      // Sección 1
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('1.   CARACTERÍSTICAS DE LA INDUSTRIA O INSTITUCIÓN.', lm, doc.y);
      doc.moveDown(0.6);
      field('1.1.   Razón Social', d.empresa_nombre ?? '');
      field('1.2.   Ubicación', d.empresa_direccion ?? '');
      field('1.3.   Nombre Gerente', d.practica1_jefe ?? '');
      doc.font('Helvetica').fontSize(10).text('1.4.   Jefe del alumno:', lm + mm(10), doc.y);
      doc.moveDown(0.3);
      field('          -   Nombre', d.practica1_supervisor ?? '');
      field('          -   Cargo', '');
      doc.font('Helvetica').fontSize(10).text('1.5.   Descripción del trabajo que realiza la Industria o Institución:', lm + mm(10), doc.y);
      doc.moveDown(0.3);
      // 3 líneas para descripción
      for (let i = 0; i < 3; i++) {
        const ly = doc.y;
        doc.moveTo(lm, ly + mm(5)).lineTo(lm + usable, ly + mm(5)).lineWidth(0.3).stroke();
        doc.y = ly + mm(7);
      }
      doc.moveDown(1);

      // Sección 2
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('2.   PERIODO DE PRÁCTICA.', lm, doc.y);
      doc.moveDown(0.6);
      field('2.1.   Fecha de Inicio', fmtF(d.practica1_fecha_inicio));
      field('2.2.   Fecha de Término', fmtF(d.practica1_fecha_termino));
      field('2.3.   Horas semanales de trabajo', d.practica1_horas_sem ? String(d.practica1_horas_sem) : '');
      field('2.4.   Total de horas prácticas', d.practica1_horas_tot ? String(d.practica1_horas_tot) : '');

      // ── Página 2 ──────────────────────────────────────────────────────
      doc.addPage();
      addHeader();

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('3.   EVALUACIÓN DE LOS MÉRITOS DEL ALUMNO PRACTICANTE.', lm, doc.y);
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(9);
      doc.text('(Marque una y sólo una (x) en el paréntesis a la derecha de la alternativa de respuestas que mejor corresponda a su opinión, en cada uno de los aspectos considerados).', lm, doc.y, { width: usable });
      doc.moveDown(0.8);

      criterios.forEach((cr, idx) => {
        if (doc.y > doc.page.height - mm(50)) { doc.addPage(); addHeader(); }
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`3.${idx + 1}.   ${cr.label}.`, lm + mm(10), doc.y);
        doc.moveDown(0.4);
        const val = ((d as any)[cr.campo] ?? '').toLowerCase();
        cr.opciones.forEach(op => {
          const marked = val === op.letra ? 'X' : ' ';
          doc.font('Helvetica').fontSize(9);
          doc.text(`      ${op.letra}.    ${op.texto}`, lm + mm(10), doc.y, { continued: true, width: usable - mm(20) });
          doc.font('Helvetica-Bold').text(`  ( ${marked} )`);
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);
      });

      // ── Sección 4 ──────────────────────────────────────────────────────
      if (doc.y > doc.page.height - mm(80)) { doc.addPage(); addHeader(); }
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('4.   INFORMACIÓN ADICIONAL.', lm, doc.y);
      doc.moveDown(0.6);

      const textoBox = (numero: string, titulo: string, contenido: string) => {
        doc.font('Helvetica').fontSize(10);
        doc.text(`${numero}   ${titulo}`, lm + mm(10), doc.y);
        doc.moveDown(0.4);
        const lines = 3;
        for (let i = 0; i < lines; i++) {
          if (i === 0 && contenido) {
            doc.font('Helvetica').fontSize(9).text(contenido, lm, doc.y, { width: usable });
            doc.moveDown(0.3);
          } else {
            const ly = doc.y;
            doc.moveTo(lm, ly + mm(5)).lineTo(lm + usable, ly + mm(5)).lineWidth(0.3).stroke();
            doc.y = ly + mm(7);
          }
        }
        doc.moveDown(0.8);
      };

      textoBox('4.1.', 'Descripción del trabajo (o trabajos) realizado (s).', d.descripcion_trabajo ?? '');
      textoBox('4.2.', 'Comentarios que Ud. quiere agregar para completar sus respuestas.', d.comentarios ?? '');
      textoBox('4.3.', 'Fue de utilidad el trabajo del practicante para su Empresa.', d.utilidad ?? '');

      doc.moveDown(1.5);
      doc.font('Helvetica').fontSize(10);
      const evalFecha = d.eval_fecha ? fmtF(d.eval_fecha) : '_______________';
      doc.text(`FECHA  ${evalFecha}`, lm, doc.y);

      // Código de verificación
      const semillaConf = `inf_conf_${seguimiento_id}_${d.rut}_${d.practica_num}`;
      const hashConf    = require('crypto').createHash('md5').update(semillaConf).digest('hex');
      const codigoConf  = `${hashConf.substring(0,4)}-${hashConf.substring(4,8)}-${hashConf.substring(8,12)}`.toUpperCase();

      // Código vertical en margen derecho (igual que carta solicitud)
      const pivotX = doc.page.width - mm(8);
      const pivotY = doc.page.height / 2;
      doc.save();
      doc.rotate(-90, { origin: [pivotX, pivotY] });
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#555555');
      doc.text(`Código: ${codigoConf}`, pivotX - mm(30), pivotY - mm(4), { width: mm(60), align: 'center', lineBreak: false });
      doc.restore();

      // Pie de página
      doc.font('Helvetica').fontSize(7).fillColor('#888888');
      doc.text(
        `Documento generado por Sistema Intranet ICCI UTA · Código de verificación: ${codigoConf}`,
        lm, doc.page.height - mm(30),
        { width: usable, align: 'center', lineBreak: false }
      );

      doc.end();
    });
  }

  async generarFormularioRevision(seguimiento_id: number): Promise<Buffer> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.nombres, a.apellido1, a.apellido2, a.rut,
        sp.practica_num,
        sp.informe_rev_fecha_inicio,
        sp.informe_rev_fecha_termino,
        CONCAT(p.nombre, ' ', p.apellido1, ' ', COALESCE(p.apellido2,'')) AS profesor_nombre,
        ei.criterio1, ei.criterio2, ei.criterio3,
        ei.criterio4, ei.criterio5, ei.criterio6,
        ei.observaciones, ei.resultado
      FROM seguimiento_practica sp
      JOIN alumnos a ON a.id = sp.alumno_id
      LEFT JOIN profesores p ON p.id = sp.informe_rev_profesor_id
      LEFT JOIN evaluacion_informe ei ON ei.seguimiento_id = sp.id
      WHERE sp.id = ${seguimiento_id}
      ORDER BY ei.created_at DESC
      LIMIT 1
    `;
    const d = rows[0];
    if (!d) throw new Error('Seguimiento no encontrado');

    const mm = (v: number) => v * 2.8346;
    const alumno   = `${d.nombres} ${d.apellido1} ${d.apellido2 ?? ''}`.trim();
    const profesor = d.profesor_nombre?.trim() || '—';
    const practica = Number(d.practica_num) === 1 ? 'Práctica I' : 'Práctica II';
    const fmtFecha = (f: any) => {
      if (!f) return '_______________';
      const dt = new Date(f);
      return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`;
    };
    const fechaRec = fmtFecha(d.informe_rev_fecha_inicio);
    const fechaEnt = fmtFecha(d.informe_rev_fecha_termino);

    const criterioLabels = [
      '1.- Título: ¿corresponde al trabajo realizado?',
      '2.- ¿Sigue el formato definido por la Jefatura de Carrera?',
      '3.- Objetivos: ¿Existe coherencia entre los objetivos generales, específicos y actividades realizadas?',
      '4.- Descripción de la empresa: ¿Existe una descripción de la empresa de acuerdo al formato entregado por la carrera?',
      '5.- Descripción del Trabajo realizado: ¿El trabajo se realizó en el contexto de la empresa y en concordancia al nivel de la práctica?',
      '6.- Experiencias Adquiridas: ¿Se describen las experiencias personales y técnicas adquiridas?',
    ];
    const criterioVals = [d.criterio1, d.criterio2, d.criterio3, d.criterio4, d.criterio5, d.criterio6];

    const resultadoLabels: Record<string, string> = {
      a: 'a.- El informe se aprueba sin observaciones',
      b: 'b.- El informe se aprueba con observaciones.',
      c: 'c.- El informe debe ser reformulado de acuerdo a las observaciones.',
      d: 'd.- El informe se rechaza y el alumno debe hacer una práctica.',
    };

    const logosDir   = 'C:/xampp/htdocs/api/uploads/logos/';
    const logoUTA    = logosDir + 'uta_linea.png';
    const logoIcci   = logosDir + 'logo_icci.png';

    return new Promise<Buffer>((resolve, reject) => {
      const doc    = new PDFDocument({ margin: mm(18), size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const nombreArchivo = `formulario_revision_${seguimiento_id}.pdf`;
        const destino = path.join('C:/xampp/htdocs/uploads/formularios_revision', nombreArchivo);
        const rutaBD  = `uploads/formularios_revision/${nombreArchivo}`;
        try {
          fs.mkdirSync(path.dirname(destino), { recursive: true });
          fs.writeFileSync(destino, buffer);
          await this.prisma.$executeRaw`
            UPDATE seguimiento_practica SET informe_rev_formulario = ${rutaBD} WHERE id = ${seguimiento_id}
          `;
        } catch (e) {
          console.error('[generarFormularioRevision] Error guardando archivo:', e);
        }
        resolve(buffer);
      });
      doc.on('error', reject);

      const pageW  = doc.page.width;
      const lm     = mm(18);
      const usable = pageW - lm * 2;

      // ── Encabezado ──────────────────────────────────────────
      const headerY = doc.y;
      // Logo UTA
      try { if (fs.existsSync(logoUTA))  doc.image(logoUTA,  lm,           headerY, { fit: [mm(22), mm(16)] }); } catch (_) {}
      // Logo ICCI
      try { if (fs.existsSync(logoIcci)) doc.image(logoIcci, lm + usable - mm(22), headerY, { fit: [mm(22), mm(16)] }); } catch (_) {}
      // Texto encabezado centro
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
      doc.text('UNIVERSIDAD DE TARAPACÁ', lm + mm(25), headerY, { width: usable - mm(50), align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(7);
      doc.text('Facultad de Ingeniería', lm + mm(25), headerY + mm(5), { width: usable - mm(50), align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('Carrera de Ingeniería Civil en Computación e Informática', lm + mm(25), headerY + mm(10), { width: usable - mm(50), align: 'center', lineBreak: false });

      doc.moveTo(lm, headerY + mm(19)).lineTo(lm + usable, headerY + mm(19)).lineWidth(1).strokeColor('#000').stroke();
      doc.moveDown(0.4);

      // ── Título ───────────────────────────────────────────────
      doc.y = headerY + mm(22);
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000');
      doc.text('Revisión  Informe de Práctica Profesional', lm, doc.y, { width: usable, align: 'center', underline: true });
      doc.moveDown(1.2);

      // ── Campos de cabecera ───────────────────────────────────
      const labelFont = () => doc.font('Helvetica').fontSize(10).fillColor('#000');
      const boldFont  = () => doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');

      const yFechas = doc.y;
      labelFont();
      doc.text(`Fecha de Recepción: ${fechaRec}`, lm, yFechas, { width: usable / 2, lineBreak: false });
      doc.text(`Fecha de Término: ${fechaEnt}`, lm + usable / 2, yFechas, { width: usable / 2, align: 'right', lineBreak: false });
      doc.moveDown(0.7);

      labelFont();
      doc.text('Académico revisor: ', lm, doc.y, { continued: true });
      boldFont();
      doc.text(profesor);
      doc.moveDown(0.7);

      labelFont();
      doc.text('Nombre del Alumno: ', lm, doc.y, { continued: true });
      boldFont();
      doc.text(alumno);
      doc.moveDown(0.7);

      labelFont();
      doc.text('Práctica (encierre en un círculo):   ', lm, doc.y, { continued: true });
      // Práctica I
      const p1Bold = Number(d.practica_num) === 1;
      if (p1Bold) boldFont(); else labelFont();
      doc.text('Práctica I', { continued: true });
      labelFont();
      doc.text('          ');
      // Práctica II
      const p2Bold = Number(d.practica_num) === 2;
      if (p2Bold) { boldFont(); doc.text('Práctica II', lm + mm(110), doc.y - mm(5)); } else { labelFont(); doc.text('Práctica II', lm + mm(110), doc.y - mm(5)); }
      doc.moveDown(1.2);

      // ── Sección 1: CONSIDERACIONES ───────────────────────────
      boldFont().fontSize(11);
      doc.text('1.- CONSIDERACIONES:', lm, doc.y);
      doc.moveDown(0.5);
      labelFont().fontSize(9);
      doc.text('Marque la alternativa S (si el informe cumple el criterio), P (si el informe cumple parcialmente el criterio) o N (si el informe no cumple el criterio) para cada ítem en la Tabla.', lm, doc.y, { width: usable });
      doc.moveDown(0.7);

      // Tabla criterios
      const colItem = usable - mm(24);
      const colSPN  = mm(8);
      const rowH    = mm(9);
      let ty = doc.y;

      // Cabecera tabla
      doc.rect(lm, ty, colItem, rowH).lineWidth(0.5).stroke();
      doc.rect(lm + colItem, ty, colSPN, rowH).stroke();
      doc.rect(lm + colItem + colSPN, ty, colSPN, rowH).stroke();
      doc.rect(lm + colItem + colSPN * 2, ty, colSPN, rowH).stroke();
      boldFont().fontSize(9);
      doc.text('ITEM', lm + mm(2), ty + mm(2), { width: colItem - mm(4), align: 'left', lineBreak: false });
      doc.text('S', lm + colItem + mm(1.5), ty + mm(2), { width: colSPN - mm(3), align: 'center', lineBreak: false });
      doc.text('P', lm + colItem + colSPN + mm(1.5), ty + mm(2), { width: colSPN - mm(3), align: 'center', lineBreak: false });
      doc.text('N', lm + colItem + colSPN * 2 + mm(1.5), ty + mm(2), { width: colSPN - mm(3), align: 'center', lineBreak: false });
      ty += rowH;

      // Filas criterios
      criterioLabels.forEach((label, idx) => {
        const val = (criterioVals[idx] ?? '').toUpperCase();
        const h   = label.length > 80 ? mm(13) : rowH;
        doc.rect(lm, ty, colItem, h).lineWidth(0.5).stroke();
        doc.rect(lm + colItem, ty, colSPN, h).stroke();
        doc.rect(lm + colItem + colSPN, ty, colSPN, h).stroke();
        doc.rect(lm + colItem + colSPN * 2, ty, colSPN, h).stroke();
        labelFont().fontSize(8.5);
        doc.text(label, lm + mm(2), ty + mm(1.5), { width: colItem - mm(4), lineBreak: true });
        // Marcar con X según valor
        boldFont().fontSize(9);
        if (val === 'S') doc.text('X', lm + colItem + mm(1.5),       ty + mm(h/2.8346 * 0.35), { width: colSPN - mm(3), align: 'center', lineBreak: false });
        if (val === 'P') doc.text('X', lm + colItem + colSPN + mm(1.5), ty + mm(h/2.8346 * 0.35), { width: colSPN - mm(3), align: 'center', lineBreak: false });
        if (val === 'N') doc.text('X', lm + colItem + colSPN*2 + mm(1.5), ty + mm(h/2.8346 * 0.35), { width: colSPN - mm(3), align: 'center', lineBreak: false });
        ty += h;
      });
      doc.y = ty + mm(4);

      // ── Sección 2: OBSERVACIONES ─────────────────────────────
      boldFont().fontSize(11);
      doc.text('2.- OBSERVACIONES.-', lm, doc.y);
      doc.moveDown(0.4);
      const obsText = d.observaciones || '';
      const obsH    = mm(28);
      doc.rect(lm, doc.y, usable, obsH).lineWidth(0.5).stroke();
      labelFont().fontSize(9);
      doc.text(obsText, lm + mm(2), doc.y + mm(2), { width: usable - mm(4), height: obsH - mm(4) });
      doc.y = doc.y + obsH + mm(4);

      // ── Sección 3: EVALUACION ────────────────────────────────
      boldFont().fontSize(11);
      doc.text('3.- EVALUACION.-', lm, doc.y);
      doc.moveDown(0.4);
      labelFont().fontSize(9);
      doc.text('Marque con una cruz (x) en la casilla al lado de la alternativa que usted estime correspondiente a la evaluación del informe.', lm, doc.y, { width: usable });
      doc.moveDown(0.6);

      const resColLabel = usable - mm(12);
      const resColBox   = mm(12);
      const resRowH     = mm(8);
      let ry = doc.y;
      ['a', 'b', 'c', 'd'].forEach(k => {
        doc.rect(lm, ry, resColLabel, resRowH).lineWidth(0.5).stroke();
        doc.rect(lm + resColLabel, ry, resColBox, resRowH).stroke();
        labelFont().fontSize(9);
        doc.text(resultadoLabels[k], lm + mm(2), ry + mm(1.5), { width: resColLabel - mm(4), lineBreak: false });
        if ((d.resultado ?? '') === k) {
          boldFont().fontSize(10);
          doc.text('X', lm + resColLabel + mm(2), ry + mm(1.5), { width: resColBox - mm(4), align: 'center', lineBreak: false });
        }
        ry += resRowH;
      });

      doc.end();
    });
  }

  async generarCartaSolicitud(seguimiento_id: number): Promise<{ buffer: Buffer; ruta: string }> {
    const d = await this.getDatosSeguimiento(seguimiento_id);
    if (!d) throw new Error('Seguimiento no encontrado');

    const alumno    = `${d.nombres} ${d.apellido1} ${d.apellido2 ?? ''}`.trim();
    const empresa   = d.empresa_nombre || d.practica1_empresa || 'Sin empresa';
    const supervisor = d.practica1_supervisor || '';
    const jefeEfectivo = await this.getJefeCarreraEfectivo();
    const jefe      = jefeEfectivo
      ? `${jefeEfectivo.nombre} ${jefeEfectivo.apellido1} ${jefeEfectivo.apellido2 ?? ''}`.trim().toUpperCase()
      : 'JEFE DE CARRERA ICCI';
    const practicaNum = d.practica_num == 1 ? 'I' : 'II';
    const fechaActual = this.formatearFechaLarga(new Date());
    const ciudadFecha = `Arica, ${fechaActual}.`;

    const semilla = `${seguimiento_id}${d.rut}${d.practica_num}`;
    const hash = require('crypto').createHash('md5').update(semilla).digest('hex');
    const codigo = `${hash.substring(0,4)}-${hash.substring(4,8)}-${hash.substring(8,12)}`.toUpperCase();

    const conocimientos = d.herramientas
      ? d.herramientas.split('\n').filter((x: string) => x.trim()).map((x: string) => `• ${x.trim()}`).join('\n')
      : 'No especificado';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 72, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks);

        // Guardar en disco
        const nombreArchivo = `carta_solicitud_p${d.practica_num}_${d.rut.replace(/[^0-9]/g,'')}_${Date.now()}.pdf`;
        const rutaServidor = path.join('C:/xampp/htdocs/uploads/informes', nombreArchivo);
        const rutaBD = `uploads/informes/${nombreArchivo}`;

        try {
          fs.mkdirSync(path.dirname(rutaServidor), { recursive: true });
          fs.writeFileSync(rutaServidor, buffer);

          // Actualizar BD
          await this.prisma.$executeRaw`
            UPDATE seguimiento_practica SET carta_solicitud = ${rutaBD} WHERE id = ${seguimiento_id}
          `;
        } catch (e) {
          console.error('Error guardando archivo:', e);
        }

        resolve({ buffer, ruta: rutaBD });
      });
      doc.on('error', reject);

      // Contenido PDF
      doc.font('Helvetica').fontSize(11);
      doc.text(ciudadFecha, { align: 'right' });
      doc.moveDown();
      doc.font('Helvetica-Bold').text(`SOLICITUD DE PRÁCTICA PROFESIONAL ${practicaNum}`, { align: 'center', underline: true });
      doc.moveDown();
      doc.font('Helvetica').text('Señor');
      doc.font('Helvetica-Bold').text(jefe);
      doc.font('Helvetica').text('JEFE DE CARRERA ICCI');
      doc.text('PRESENTE');
      doc.moveDown();
      doc.text('De mi consideración:');
      doc.moveDown();
      doc.text(`Junto con saludar, informo que la empresa `, { continued: true });
      doc.font('Helvetica-Bold').text(empresa, { continued: true });
      doc.font('Helvetica').text(` tiene el interés de recibir como alumno en práctica profesional ${practicaNum} de la Carrera de Ingeniería Civil en Computación e Informática a `);
      doc.font('Helvetica-Bold').text(alumno, { continued: false });
      doc.font('Helvetica');
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Conocimientos requeridos:');
      doc.font('Helvetica').text(conocimientos);
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Datos del estudiante:');
      doc.font('Helvetica');
      doc.text(`• Nombre: ${alumno}`);
      doc.text(`• RUT: ${d.rut}`);
      doc.text(`• Horas semanales: ${d.practica1_horas_sem || 'No especificado'}`);
      doc.text(`• Horas totales: ${d.practica1_horas_tot || 'No especificado'}`);
      doc.text(`• Inicio: ${this.formatearFechaLarga(d.practica1_fecha_inicio)}`);
      doc.text(`• Término: ${this.formatearFechaLarga(d.practica1_fecha_termino)}`);
      doc.text(`• Supervisor: ${supervisor}`);
        doc.moveDown(3);
        doc.text('Atentamente,');
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text(supervisor);
        doc.font('Helvetica').text('Supervisor de Práctica');
        doc.text(empresa);  // ← también faltaba la empresa

        // Código de verificación al costado derecho
        doc.save();
        doc.rotate(-90, { origin: [doc.page.width - 10, doc.page.height / 2] });
        doc.fontSize(7).fillColor('gray')
          .text(`Código: ${codigo}`, doc.page.width - 10, doc.page.height / 2 - 60, {
            width: 200,
            align: 'center'
          });
        doc.restore();

        // Texto al pie de página
        doc.fontSize(8).fillColor('gray');
        const yPie = doc.page.height - 60;
        doc.text(
          `Documento generado el ${new Date().toLocaleString('es-CL')} · Sistema Intranet ICCI UTA`,
          72, doc.page.height - 90,
          { align: 'center', width: doc.page.width - 144 }
        );

        doc.end(); 
    });
  }
}
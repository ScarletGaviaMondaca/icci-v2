import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';

const mm = (v: number) => v * 2.8346;

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      include: { malla: true },
      orderBy: { anio: 'desc' },
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        malla: true,
        malla_restriccion: true,
        practicas: true,
      },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async create(data: any) {
    return this.prisma.plan.create({ data: this.sanitizar(data) });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: this.sanitizar(data) });
  }

  private sanitizar(data: any) {
    const toInt  = (v: any) => v !== '' && v != null ? parseInt(v)  : null;
    const toDate = (v: any) => v !== '' && v != null ? new Date(v)  : null;
    const toStr  = (v: any) => v !== '' && v != null ? String(v)    : null;

    return {
      titulo:               toStr(data.titulo),
      anio:                 toInt(data.anio),
      version:              toStr(data.version),
      duracion:             toInt(data.duracion),
      fecha_oficializacion: toDate(data.fecha_oficializacion),
      fecha_inicio:         toDate(data.fecha_inicio),
      fecha_cierre:         toDate(data.fecha_cierre),
      enfoque:              toStr(data.enfoque),
      perfil_egreso:        toStr(data.perfil_egreso),
      proposito_formativo:  toStr(data.proposito_formativo),
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.malla_restriccion.deleteMany({ where: { plan_id: id } });
    await this.prisma.malla.deleteMany({ where: { plan_id: id } });
    return this.prisma.plan.delete({ where: { id } });
  }

  async getMalla(plan_id: number) {
    return this.prisma.malla.findMany({
      where: { plan_id },
      orderBy: { pm: 'asc' },
    });
  }

  async getRestricciones(plan_id: number) {
    return this.prisma.malla_restriccion.findMany({
      where: { plan_id },
      orderBy: { id: 'asc' },
    });
  }

  // ── Restriccion manual ─────────────────────────────────────────────────

  async crearRestriccion(data: { plan_id: number; ramo_codigo: string; req_codigo: string; tipo: 'PRE' | 'CO' }) {
    const { plan_id, ramo_codigo, req_codigo, tipo } = data;
    const ramo = ramo_codigo.trim().toUpperCase();
    const req  = req_codigo.trim().toUpperCase();
    if (!plan_id || !ramo || !req || !tipo)
      throw new BadRequestException('Faltan campos requeridos');
    if (ramo === req)
      throw new BadRequestException('Un ramo no puede ser requisito de si mismo');
    if (tipo !== 'PRE' && tipo !== 'CO')
      throw new BadRequestException('El tipo debe ser PRE o CO');
    const ramoDB = await this.prisma.malla.findFirst({ where: { plan_id, codigo: ramo } });
    const reqDB  = await this.prisma.malla.findFirst({ where: { plan_id, codigo: req } });
    if (!ramoDB) throw new BadRequestException(`El codigo ${ramo} no existe en la malla de este plan`);
    if (!reqDB)  throw new BadRequestException(`El codigo ${req} no existe en la malla de este plan`);
    const existe = await this.prisma.malla_restriccion.findFirst({ where: { plan_id, ramo_codigo: ramo, req_codigo: req } });
    if (existe) throw new ConflictException('Esta restriccion ya existe');
    return this.prisma.malla_restriccion.create({
      data: { plan_id, ramo_codigo: ramo, req_codigo: req, tipo: tipo as any },
    });
  }

  async eliminarRestriccion(id: number) {
    const r = await this.prisma.malla_restriccion.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Restriccion no encontrada');
    return this.prisma.malla_restriccion.delete({ where: { id } });
  }

  // ── CSV helpers ───────────────────────────────────────────────────────

  private parseCsv(contenido: string): string[][] {
    const lines = contenido.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    const delimitador = lines[0].includes(';') ? ';' : ',';
    return lines.map(l => l.split(delimitador).map(c => c.trim().replace(/^"|"$/g, '')));
  }

  private normKey(k: string): string {
    return k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  private mapColumnasMalla(headers: string[]): Record<string, number> {
    const aliases: Record<string, string[]> = {
      nro:      ['nro', 'n'],
      nombre:   ['nombre', 'asignatura', 'ramo', 'name', 'asig'],
      tipo:     ['tipo', 'type'],
      pm:       ['pm', 'semestre', 'sem'],
      creditos: ['creditos', 'credito', 'cr', 'cred'],
      hc:       ['hc', 'h_catedra', 'hcatedra'],
      ht:       ['ht', 'h_taller', 'htaller'],
      hl:       ['hl', 'h_lab', 'hlab'],
      codigo:   ['codigo', 'code', 'cod'],
    };
    const mapa: Record<string, number> = {};
    headers.forEach((h, idx) => {
      const k = this.normKey(h);
      for (const [campo, vals] of Object.entries(aliases)) {
        if (vals.includes(k)) { mapa[campo] = idx; break; }
      }
    });
    return mapa;
  }

  // ── Importar malla CSV ────────────────────────────────────────────────

  async importarMalla(plan_id: number, file: Express.Multer.File): Promise<{ insertadas: number; ignoradas: number }> {
    if (!plan_id) throw new BadRequestException('plan_id requerido');
    await this.findOne(plan_id);
    const contenido = fs.readFileSync(file.path, 'utf-8');
    fs.unlinkSync(file.path);
    const filas = this.parseCsv(contenido);
    if (filas.length < 2) throw new BadRequestException('CSV vacio o sin datos');
    const col = this.mapColumnasMalla(filas[0]);
    if (col.codigo === undefined) throw new BadRequestException('El CSV debe tener columna codigo');
    let insertadas = 0, ignoradas = 0;
    for (let i = 1; i < filas.length; i++) {
      const row = filas[i];
      if (row.every(c => !c)) continue;
      const codigo   = (col.codigo   !== undefined ? row[col.codigo]   : '').trim().toUpperCase();
      const nombre   =  col.nombre   !== undefined ? row[col.nombre]   : null;
      const nro      =  col.nro      !== undefined ? row[col.nro]      : null;
      const tipo     =  col.tipo     !== undefined ? row[col.tipo]     : null;
      const pm       =  col.pm       !== undefined ? (parseInt(row[col.pm])       || null) : null;
      const creditos =  col.creditos !== undefined ? (parseInt(row[col.creditos]) || null) : null;
      const hc       =  col.hc       !== undefined ? (parseInt(row[col.hc])       || null) : null;
      const ht       =  col.ht       !== undefined ? (parseInt(row[col.ht])       || null) : null;
      const hl       =  col.hl       !== undefined ? (parseInt(row[col.hl])       || null) : null;
      if (!codigo) { ignoradas++; continue; }
      try {
        await this.prisma.malla.upsert({
          where: { plan_id_codigo: { plan_id, codigo } },
          create: { plan_id, codigo, nombre, nro, tipo, pm, creditos, hc, ht, hl },
          update: {},
        });
        insertadas++;
      } catch { ignoradas++; }
    }
    return { insertadas, ignoradas };
  }

  // ── Importar restricciones CSV ────────────────────────────────────────

  async importarRestricciones(plan_id: number, file: Express.Multer.File): Promise<{ insertadas: number; ignoradas: number; omitidas: number }> {
    if (!plan_id) throw new BadRequestException('plan_id requerido');
    await this.findOne(plan_id);
    const contenido = fs.readFileSync(file.path, 'utf-8');
    fs.unlinkSync(file.path);
    const filas = this.parseCsv(contenido);
    if (filas.length < 2) throw new BadRequestException('CSV vacio o sin datos');
    const headers = filas[0].map(h => this.normKey(h));
    const idxRamo = headers.findIndex(h => ['ramo_codigo', 'ramo'].includes(h));
    const idxReq  = headers.findIndex(h => ['req_codigo', 'req', 'prerequisito', 'prereq'].includes(h));
    const idxTipo = headers.findIndex(h => h === 'tipo');
    if (idxRamo < 0 || idxReq < 0)
      throw new BadRequestException('El CSV debe tener columnas ramo_codigo y req_codigo');
    const codigos = new Set(
      (await this.prisma.malla.findMany({ where: { plan_id }, select: { codigo: true } }))
        .map(m => m.codigo?.toUpperCase() ?? '')
    );
    let insertadas = 0, ignoradas = 0, omitidas = 0;
    for (let i = 1; i < filas.length; i++) {
      const row = filas[i];
      if (row.every(c => !c)) continue;
      const ramo = (row[idxRamo] ?? '').trim().toUpperCase();
      const req  = (row[idxReq]  ?? '').trim().toUpperCase();
      let   tipo = idxTipo >= 0 ? (row[idxTipo] ?? '').trim().toUpperCase() : 'PRE';
      if (!ramo || !req) { omitidas++; continue; }
      if (ramo === req)  { omitidas++; continue; }
      if (!['PRE', 'CO'].includes(tipo)) tipo = 'PRE';
      if (!codigos.has(ramo) || !codigos.has(req)) { omitidas++; continue; }
      try {
        await this.prisma.malla_restriccion.create({
          data: { plan_id, ramo_codigo: ramo, req_codigo: req, tipo: tipo as any },
        });
        insertadas++;
      } catch { ignoradas++; }
    }
    return { insertadas, ignoradas, omitidas };
  }

  // ── Exportar PDF (grid visual compacto — todo en una hoja A3 landscape) ─

  async exportarMallaPDF(plan_id: number): Promise<Buffer> {
    const plan  = await this.findOne(plan_id);
    const malla = await this.prisma.malla.findMany({ where: { plan_id } });

    const parseNro = (nro: string | null) => {
      if (!nro) return [9999, 9999];
      return nro.split('.').map(p => parseInt(p) || 9999);
    };
    malla.sort((a, b) => {
      const [sa, na] = parseNro(a.nro);
      const [sb, nb] = parseNro(b.nro);
      return sa !== sb ? sa - sb : na - nb;
    });

    const porSemestre: Record<number, typeof malla> = {};
    for (const r of malla) {
      const sem = parseInt((r.nro ?? '0').split('.')[0]) || 0;
      if (!porSemestre[sem]) porSemestre[sem] = [];
      porSemestre[sem].push(r);
    }
    const semestres = Object.keys(porSemestre).map(Number).sort((a, b) => a - b);

    // ── Dimensiones de página ─────────────────────────────────────────────
    const PW       = mm(420);   // A3 landscape
    const PH       = mm(297);
    const MX       = mm(6);
    const MTOP     = mm(24);    // alto del header
    const MBOT     = mm(8);
    const CONTENT_W = PW - MX * 2;
    const CONTENT_H = PH - MTOP - MBOT;

    // ── Calcular tamaños dinámicamente ──────────────────────────────────
    const numSems   = semestres.length || 1;
    const maxRamos  = Math.max(...semestres.map(s => (porSemestre[s] ?? []).length), 1);
    const GAP_COL   = mm(1.5);
    const HDR_SEM_H = mm(5.5);
    const GAP_CARD  = mm(0.8);

    // Ancho de columna
    const colW = (CONTENT_W - GAP_COL * (numSems - 1)) / numSems;

    // Altura de tarjeta: calculada para que todo quepa, con tope de 16 mm
    const cardAreaH = CONTENT_H - HDR_SEM_H - GAP_CARD;
    const CARD_H    = Math.min(
      mm(16),
      Math.max(mm(9), (cardAreaH - GAP_CARD * (maxRamos - 1)) / maxRamos),
    );

    // Tamaño de fuente proporcional al alto de tarjeta
    const fsNombre  = Math.min(6.5, Math.max(4.5, CARD_H * 0.20));
    const fsMeta    = Math.min(5.5, Math.max(4,   CARD_H * 0.16));
    const fsCodigo  = Math.min(6.5, Math.max(4.5, CARD_H * 0.19));

    // ── Colores ──────────────────────────────────────────────────────────
    const AZUL    = '#1E3F7A';
    const NAR     = '#FC7201';
    const BLANCO  = '#FFFFFF';
    const CARD_BG = '#F4F7FF';
    const CARD_BD = '#AABBD4';

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: [PW, PH], margin: 0 });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header de página ────────────────────────────────────────────
      doc.rect(0, 0, PW, MTOP - mm(1.5)).fill(AZUL);
      doc.rect(0, MTOP - mm(1.5), PW, mm(1.5)).fill(NAR);

      const titulo = 'MALLA CURRICULAR  —  ' + (plan.titulo ?? '').toUpperCase();
      const subtit = 'Plan ' + (plan.anio ?? '') +
                     (plan.version ? '  •  Versión ' + plan.version : '') +
                     '  |  ' + malla.length + ' ramos';
      doc.fillColor(BLANCO).fontSize(11).font('Helvetica-Bold')
         .text(titulo, MX, mm(5), { width: PW - MX * 2, align: 'center' });
      doc.fontSize(7.5).font('Helvetica')
         .text(subtit, MX, mm(13.5), { width: PW - MX * 2, align: 'center' });

      // ── Grid de semestres ────────────────────────────────────────────
      for (let gi = 0; gi < semestres.length; gi++) {
        const sem   = semestres[gi];
        const ramos = porSemestre[sem] ?? [];
        const colX  = MX + gi * (colW + GAP_COL);

        // Cabecera de semestre
        doc.rect(colX, MTOP, colW, HDR_SEM_H).fill(AZUL);
        doc.fillColor(BLANCO).fontSize(Math.min(8, fsCodigo)).font('Helvetica-Bold')
           .text('Sem ' + sem, colX, MTOP + mm(1.5), { width: colW, align: 'center' });

        let cardY = MTOP + HDR_SEM_H + GAP_CARD;

        for (let ri = 0; ri < ramos.length; ri++) {
          const r = ramos[ri];

          // No dibujar si se saldría del margen inferior
          if (cardY + CARD_H > PH - MBOT) break;

          // Fondo de tarjeta con borde
          doc.rect(colX, cardY, colW, CARD_H).fill(CARD_BG).stroke(CARD_BD);

          // Línea naranja superior de la tarjeta
          doc.rect(colX, cardY, colW, mm(0.8)).fill(NAR);

          // nro (izquierda) + codigo (derecha)
          const topY  = cardY + mm(1.2);
          const midX  = colX + colW * 0.4;
          doc.fillColor('#8899BB').fontSize(fsMeta).font('Helvetica')
             .text(String(r.nro ?? ''), colX + mm(0.8), topY,
               { width: colW * 0.38, lineBreak: false });
          doc.fillColor(AZUL).fontSize(fsCodigo).font('Helvetica-Bold')
             .text(String(r.codigo ?? ''), midX, topY,
               { width: colW - colW * 0.4 - mm(1), align: 'right', lineBreak: false });

          // Línea divisoria fina
          const divY = topY + fsCodigo * 0.9;
          doc.rect(colX + mm(0.5), divY, colW - mm(1), 0.4).fill('#CCDAEE');

          // Nombre (truncado para caber)
          const nameY    = divY + mm(0.8);
          const nameH    = CARD_H - (nameY - cardY) - mm(5);
          doc.fillColor('#111827').fontSize(fsNombre).font('Helvetica-Bold')
             .text(String(r.nombre ?? ''), colX + mm(0.8), nameY,
               { width: colW - mm(1.6), height: Math.max(mm(4), nameH), lineBreak: true, ellipsis: true });

          // Meta (tipo · créditos · horas) — pegada al fondo de la tarjeta
          const metaY = cardY + CARD_H - mm(4);
          doc.rect(colX, metaY - mm(0.5), colW, 0.4).fill('#CCDAEE');
          const meta = (r.tipo ?? '') + ' · ' + (r.creditos ?? '-') + 'cr' +
                       ' · ' + (r.hc ?? '-') + '/' + (r.ht ?? '-') + '/' + (r.hl ?? '-');
          doc.fillColor('#374151').fontSize(fsMeta).font('Helvetica')
             .text(meta, colX + mm(0.8), metaY, { width: colW - mm(1.6), lineBreak: false });

          cardY += CARD_H + GAP_CARD;
        }
      }

      // ── Pie ─────────────────────────────────────────────────────────
      doc.rect(0, PH - MBOT, PW, MBOT).fill(AZUL);
      doc.fillColor(BLANCO).fontSize(6).font('Helvetica')
         .text(
           'Universidad de Tarapacá  –  Ingeniería en Computación e Informática',
           MX, PH - mm(5.5), { width: PW - MX * 2, align: 'center' },
         );

      doc.end();
    });
  }
}
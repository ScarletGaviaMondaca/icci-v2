import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

@Injectable()
export class AlumnosService {
  constructor(private prisma: PrismaService) {}

async findAll(tipo?: string) {
  return this.prisma.alumnos.findMany({
    where: tipo ? { tipo: tipo as any } : undefined,
    orderBy: { apellido1: 'asc' },
  });
}

async findOne(id: number) {
  const alumno = await this.prisma.alumnos.findUnique({
    where: { id },
    include: {
      seguimiento: true,
    },
  });
  if (!alumno) throw new NotFoundException('Alumno no encontrado');
  return alumno;
}

async findByRut(rut: string) {
  const alumno = await this.prisma.alumnos.findUnique({
    where: { rut },
    include: { seguimiento: true },
  });
  if (!alumno) throw new NotFoundException('Alumno no encontrado');
  return alumno;
}
  async findEspeciales() {
    return this.prisma.alumnos.findMany({
      where: { plan: null },
      orderBy: { apellido1: 'asc' },
    });
  }

  async create(data: any) {
    const sanitized = this.sanitizar(data);
    return this.prisma.alumnos.create({ data: sanitized });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const sanitized = this.sanitizar(data);
    return this.prisma.alumnos.update({ where: { id }, data: sanitized });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.alumnos.delete({ where: { id } });
  }

  private sanitizar(data: any) {
    const toInt  = (v: any) => v !== '' && v != null ? parseInt(v) : null;
    const toDate = (v: any) => v !== '' && v != null ? new Date(v) : null;
    const toStr  = (v: any) => v !== '' && v != null ? String(v) : null;

    return {
      rut:                  data.rut,
      nombres:              data.nombres,
      apellido1:            data.apellido1,
      apellido2:            toStr(data.apellido2),
      sexo:                 toStr(data.sexo),
      fecha_nacimiento:     toDate(data.fecha_nacimiento),
      nacionalidad:         toStr(data.nacionalidad),
      etnia:                toStr(data.etnia),
      direccion:            toStr(data.direccion),
      telefono:             toStr(data.telefono),
      telefono_emergencia:  toStr(data.telefono_emergencia),
      correo_personal:      toStr(data.correo_personal),
      correo_institucional: toStr(data.correo_institucional),
      plan:                 toInt(data.plan),
      plan_texto:           toStr(data.plan_texto),
      colegio:              toStr(data.colegio),
      anio_ingreso:         toInt(data.anio_ingreso),
      fecha_matricula:      toDate(data.fecha_matricula),
      sistema_ingreso:      toStr(data.sistema_ingreso),
      puntaje_ingreso:      toInt(data.puntaje_ingreso),
      nem:                  toInt(data.nem),
      gratuidad:            toStr(data.gratuidad),
      tipo:                 data.tipo ?? 'regular',
      anio_reingreso:       toInt(data.anio_reingreso),
    };
  }

  async search(query: string) {
    return this.prisma.alumnos.findMany({
      where: {
        OR: [
          { nombres: { contains: query } },
          { apellido1: { contains: query } },
          { apellido2: { contains: query } },
          { rut: { contains: query } },
          { correo_institucional: { contains: query } },
        ],
      },
      orderBy: { apellido1: 'asc' },
      take: 20,
    });
  }

  async importarCSV(file: Express.Multer.File): Promise<{
    estado: string; mensaje: string;
    insertados: number; duplicados: number; actualizados: number; errores: string[];
  }> {
    const result = {
      estado: 'ok', mensaje: 'Importación completada',
      insertados: 0, duplicados: 0, actualizados: 0, errores: [] as string[],
    };

    try {
      let buf = fs.readFileSync(file.path);
      if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) buf = buf.slice(3);
      const texto = buf.toString('utf-8');

      const lineas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .split('\n').filter(l => l.trim() !== '');

      if (lineas.length < 2)
        return { ...result, estado: 'error', mensaje: 'El archivo está vacío o solo tiene encabezados' };

      const headerLine = lineas[0];
      const sc = headerLine.split(';').length, tc = headerLine.split('\t').length, cc = headerLine.split(',').length;
      const delim = sc > cc ? ';' : tc > cc ? '\t' : ',';

      const headers = this.csvSplit(headerLine, delim)
        .map(h => h.replace(/^﻿/, '').trim().toLowerCase()
                    .replace(/[\s\-]+/g, '_').normalize('NFD').replace(/[̀-ͯ]/g, ''));

      const hSet = new Set(headers);
      // esSistema: formato propio del sistema (apellido1 y nombres en columnas separadas)
      const esNuevo   = hSet.has('nrut') && hSet.has('dv');
      const esSistema = !esNuevo && hSet.has('rut') && hSet.has('nombres') && hSet.has('apellido1');
      const esHonores = !esNuevo && !esSistema && hSet.has('rut') && hSet.has('nombres') && hSet.has('plan')
                        && (hSet.has('anio_ingreso') || hSet.has('ano_ingreso')) && hSet.has('fecha_nacimiento');
      const esSimple  = !esNuevo && !esSistema && !esHonores && hSet.has('rut')
                        && (hSet.has('nombre') || hSet.has('nombres'))
                        && (hSet.has('plan') || hSet.has('carrera'))
                        && (hSet.has('ano_ingreso') || hSet.has('anio_ingreso'));
      const esAntiguo = !esNuevo && !esSistema && !esHonores && !esSimple
                        && hSet.has('rut') && hSet.has('apellido1') && hSet.has('nombres');

      if (!esNuevo && !esSistema && !esHonores && !esSimple && !esAntiguo)
        return { ...result, estado: 'error', mensaje: 'Esquema CSV no reconocido. Columnas: ' + headers.join(', ') };

      const get = (row: Record<string, string>, ...aliases: string[]): string | null => {
        for (const a of aliases) if (a in row && row[a].trim()) return row[a].trim();
        return null;
      };
      const toInt = (v: string | null): number | null => {
        if (!v) return null;
        const n = parseInt(v.replace(/[^0-9]/g, ''));
        return isNaN(n) ? null : n;
      };
      const parsePlan = (v: string | null): number | null => {
        const n = toInt(v);
        if (!n) return null;
        const s = String(n);
        return s.length >= 4 ? parseInt(s.slice(0, 4)) : n;
      };

      for (let i = 1; i < lineas.length; i++) {
        const lineNum = i + 1;
        try {
          const cells = this.csvSplit(lineas[i], delim);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });

          let rut: string | null = null;
          let nombres: string | null = null;
          let apellido1: string | null = null;
          let apellido2: string | null = null;
          let plan: number | null = null;
          let anio_ingreso: number | null = null;

          if (esNuevo) {
            const nrut = (get(row, 'nrut', 'numero_rut', 'numero') ?? '').replace(/[^0-9]/g, '');
            const dv   = (get(row, 'dv', 'digito_verificador') ?? '').replace(/[^0-9kK]/gi, '').toUpperCase();
            rut        = this.formatearRut(nrut + dv);
            apellido1  = get(row, 'apellido1', 'apellido_paterno', 'paterno');
            apellido2  = get(row, 'apellido2', 'apellido_materno', 'materno');
            nombres    = get(row, 'nombres', 'nombre');
            anio_ingreso = toInt(get(row, 'anio_ingreso', 'ano_ingreso', 'year_ingreso'));
            plan       = anio_ingreso !== null ? (anio_ingreso < 2019 ? 2013 : 2019) : null;

          } else if (esSistema) {
            // Formato propio del sistema: columnas ya separadas (RUT, Nombres, Apellido1, Apellido2, ...)
            rut        = this.formatearRut(get(row, 'rut') ?? '');
            nombres    = get(row, 'nombres');
            apellido1  = get(row, 'apellido1');
            apellido2  = get(row, 'apellido2');
            plan       = parsePlan(get(row, 'plan'));
            anio_ingreso = toInt(get(row, 'anio_ingreso'));

          } else if (esHonores || esSimple) {
            // Nombre combinado en formato "APELLIDO1 APELLIDO2 NOMBRES..."
            rut = this.formatearRut(get(row, 'rut') ?? '');
            const full = (get(row, 'nombres', 'nombre') ?? '').trim().split(/\s+/).filter(Boolean);
            apellido1  = full[0] ?? null;
            apellido2  = full.length >= 3 ? full[1] : null;
            nombres    = full.length >= 3 ? full.slice(2).join(' ') : (full[1] ?? null);
            anio_ingreso = toInt(get(row, 'anio_ingreso', 'ano_ingreso'));
            plan       = parsePlan(get(row, 'plan', 'carrera'));

          } else { // esAntiguo
            rut        = this.formatearRut(get(row, 'rut') ?? '');
            apellido1  = get(row, 'apellido1', 'apellido_paterno', 'paterno');
            apellido2  = get(row, 'apellido2', 'apellido_materno', 'materno');
            nombres    = get(row, 'nombres', 'nombre');
            anio_ingreso = toInt(get(row, 'anio_ingreso', 'ano_ingreso'));
            plan       = parsePlan(get(row, 'plan', 'carrera'));
          }

          if (!rut) { result.errores.push(`Fila ${lineNum}: RUT inválido`); continue; }
          if (!nombres && !apellido1) { result.errores.push(`Fila ${lineNum}: sin nombre`); continue; }

          // Correos: primero columnas directas (formato sistema), luego campo combinado
          const correo_institucional =
            get(row, 'correo_institucional') ??
            this.asignarCorreos(get(row, 'e_mail', 'email', 'correo', 'correo_electronico')).correo_institucional;
          const correo_personal =
            get(row, 'correo_personal') ??
            this.asignarCorreos(get(row, 'e_mail', 'email', 'correo', 'correo_electronico')).correo_personal;

          const optional = {
            sexo:                 get(row, 'sexo', 'genero', 'género') ?? null,
            fecha_nacimiento:     this.parseDate(get(row, 'fecha_nacimiento', 'f_nacimiento', 'nacimiento', 'fecha_nac')),
            nacionalidad:         get(row, 'nacionalidad') ?? null,
            etnia:                get(row, 'etnia', 'pueblo_originario', 'pueblos_originarios') ?? null,
            direccion:            get(row, 'direccion', 'domicilio') ?? null,
            telefono:             get(row, 'telefono', 'celular', 'fono', 'telefono_celular') ?? null,
            telefono_emergencia:  get(row, 'telefono_emergencia', 'tel_emergencia', 'fono_emergencia') ?? null,
            correo_personal,
            correo_institucional,
            colegio:              get(row, 'colegio', 'colegio_procedencia') ?? null,
            fecha_matricula:      this.parseDate(get(row, 'fecha_matricula', 'fecha_mat')),
            sistema_ingreso:      get(row, 'sistema_ingreso', 'via_ingreso') ?? null,
            puntaje_ingreso:      toInt(get(row, 'puntaje_ingreso', 'puntaje_nem', 'puntaje')),
            nem:                  toInt(get(row, 'nem')),
            gratuidad:            get(row, 'gratuidad', 'beca_gratuidad') ?? null,
          };

          const existing = await this.prisma.alumnos.findUnique({ where: { rut } });

          if (existing) {
            const update: any = { nombres, apellido1, apellido2, plan, anio_ingreso };
            for (const [k, v] of Object.entries(optional)) {
              if (v != null) update[k] = v;
            }
            await this.prisma.alumnos.update({ where: { rut }, data: update });
            result.actualizados++;
          } else {
            await this.prisma.alumnos.create({ data: { rut, nombres: nombres ?? '', apellido1: apellido1 ?? '', apellido2, plan, anio_ingreso, ...optional } });
            result.insertados++;
          }
        } catch (e: any) {
          result.errores.push(`Fila ${lineNum}: ${e.message ?? e}`);
        }
      }
    } finally {
      try { fs.unlinkSync(file.path); } catch {}
    }

    return result;
  }

  private calcularDV(cuerpo: string): string {
    let suma = 0, mult = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    const r = suma % 11;
    return r === 0 ? '0' : r === 1 ? 'K' : String(11 - r);
  }

  private formatearRut(raw: string): string | null {
    if (!raw) return null;
    const clean = raw.replace(/[^0-9kK]/gi, '').toUpperCase();
    if (clean.length < 2) return null;
    const cuerpo = clean.slice(0, -1);
    const dvDado = clean.slice(-1);
    if (!/^\d+$/.test(cuerpo)) return null;
    if (dvDado !== this.calcularDV(cuerpo)) return null;
    return parseInt(cuerpo).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dvDado;
  }

  private parseDate(s: string | null): Date | null {
    if (!s) return null;
    s = s.trim();
    const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m1) {
      const d = new Date(`${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`);
      if (!isNaN(d.getTime())) return d;
    }
    const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m2) {
      const d = new Date(`${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  private asignarCorreos(emailRaw: string | null): { correo_institucional: string | null; correo_personal: string | null } {
    if (!emailRaw) return { correo_institucional: null, correo_personal: null };
    const emails = emailRaw.split(/[;,]/).map(e => e.trim()).filter(Boolean);
    let ci: string | null = null, cp: string | null = null;
    for (const email of emails) {
      if (email.toLowerCase().includes('inacap')) ci = email;
      else cp = email;
    }
    if (!ci && !cp && emails.length === 1) cp = emails[0];
    return { correo_institucional: ci, correo_personal: cp };
  }

  private csvSplit(line: string, delim: string): string[] {
    const fields: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { fields.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  async exportarCSV(filtros: { rut?: string; nombre?: string; apellidos?: string; plan?: string; anio?: string }): Promise<string> {
    const todos = await this.prisma.alumnos.findMany({ orderBy: { apellido1: 'asc' } });

    const norm = (v: any) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    let lista = todos as any[];
    if (filtros.rut)       lista = lista.filter(a => norm(a.rut).includes(norm(filtros.rut)));
    if (filtros.nombre)    lista = lista.filter(a => norm(a.nombres).includes(norm(filtros.nombre)));
    if (filtros.apellidos) lista = lista.filter(a => norm(`${a.apellido1 ?? ''} ${a.apellido2 ?? ''}`).includes(norm(filtros.apellidos)));
    if (filtros.plan)      lista = lista.filter(a => String(a.plan ?? '') === filtros.plan);
    if (filtros.anio)      lista = lista.filter(a => String(a.anio_ingreso ?? '').includes(filtros.anio!));

    const headers = [
      'RUT', 'Nombres', 'Apellido1', 'Apellido2', 'Plan', 'Plan_Texto',
      'Tipo', 'Anio_Ingreso', 'Correo_Institucional', 'Correo_Personal',
      'Telefono', 'Avance', 'Activo',
    ];

    const esc = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];
    for (const a of lista) {
      lines.push([
        a.rut, a.nombres, a.apellido1, a.apellido2, a.plan, a.plan_texto,
        a.tipo, a.anio_ingreso, a.correo_institucional, a.correo_personal,
        a.telefono, a.avance, a.activo,
      ].map(esc).join(','));
    }
    return lines.join('\r\n');
  }
}
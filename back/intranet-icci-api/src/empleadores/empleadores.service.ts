import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const COMPROMISO_PATH = path.join(process.cwd(), 'uploads', 'compromisos', 'compromiso.pdf');

@Injectable()
export class EmpleadoresService {
  constructor(private prisma: PrismaService) {}

  // ── Empresas (públicos para registro) ────────────────────────────

  async listarEmpresas() {
    return this.prisma.empresas.findMany({
      where: { activo: 1 },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async crearEmpresa(nombre: string) {
    if (!nombre?.trim()) throw new BadRequestException('Nombre requerido');
    const existing = await this.prisma.empresas.findFirst({ where: { nombre: nombre.trim() } });
    if (existing) throw new BadRequestException('Ya existe una empresa con ese nombre');
    return this.prisma.empresas.create({ data: { nombre: nombre.trim() } });
  }

  // ── Documento de compromiso ───────────────────────────────────────

  getCompromisoInfo(): { existe: boolean; url: string | null } {
    const existe = fs.existsSync(COMPROMISO_PATH);
    return { existe, url: existe ? 'http://localhost:3000/empleadores/compromiso/ver' : null };
  }

  guardarCompromiso(file: Express.Multer.File) {
    const dir = path.dirname(COMPROMISO_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.renameSync(file.path, COMPROMISO_PATH);
    return { ok: true, url: 'http://localhost:3000/empleadores/compromiso/ver' };
  }

  // ── Empleadores (admin) ───────────────────────────────────────────

  async listar() {
    return this.prisma.empleadores.findMany({
      include: { empresa: { select: { id: true, nombre: true } } },
      orderBy: { nombres: 'asc' },
    });
  }

  async generarToken(correo: string): Promise<{ token: string; link: string }> {
    await this.prisma.empleador_tokens.updateMany({
      where: { correo, usado: 0 },
      data: { usado: 1 },
    });
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.empleador_tokens.create({ data: { token, correo } });
    const link = `http://localhost:4200/registro-empleador?token=${token}`;
    return { token, link };
  }

  async validarToken(token: string) {
    const row = await this.prisma.empleador_tokens.findUnique({ where: { token } });
    if (!row || row.usado === 1) throw new BadRequestException('Token inválido o ya utilizado');
    return { correo: row.correo };
  }

  async registrar(data: {
    token: string;
    empresa_id: number;
    nombres: string;
    apellido1: string;
    apellido2?: string;
    cargo?: string;
    correo: string;
    telefono?: string;
    password: string;
  }) {
    const tokenRow = await this.prisma.empleador_tokens.findUnique({ where: { token: data.token } });
    if (!tokenRow || tokenRow.usado === 1) throw new BadRequestException('Token inválido o ya utilizado');

    const empresa = await this.prisma.empresas.findUnique({ where: { id: +data.empresa_id } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const empleador = await this.prisma.empleadores.create({
      data: {
        empresa_id: +data.empresa_id,
        nombres:   data.nombres,
        apellido1: data.apellido1,
        apellido2: data.apellido2 ?? null,
        cargo:     data.cargo ?? null,
        correo:    data.correo,
        telefono:  data.telefono ?? null,
      },
    });

    const base = (data.nombres.split(' ')[0] + data.apellido1)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');

    let username = base;
    let intento = 1;
    while (await this.prisma.usuarios.findFirst({ where: { username } })) {
      username = `${base}${++intento}`;
    }

    const hash = await bcrypt.hash(data.password, 10);
    await this.prisma.usuarios.create({
      data: {
        username,
        password:     hash,
        rol:          'empleador',
        empleador_id: empleador.id,
        nombre:       data.nombres,
        apellido1:    data.apellido1,
        apellido2:    data.apellido2 ?? null,
        correo:       data.correo,
      },
    });

    await this.prisma.empleador_tokens.update({
      where: { token: data.token },
      data: { usado: 1, empleador_id: empleador.id },
    });

    return { username, message: 'Empleador registrado correctamente' };
  }
}

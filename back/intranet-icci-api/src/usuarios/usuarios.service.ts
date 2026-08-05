import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.usuarios.findMany({
      select: {
        id: true,
        username: true,
        rol: true,
        activo: true,
        created_at: true,
        nombre: true,
        apellido1: true,
        apellido2: true,
        correo: true,
        alumno_id: true,
        profesor_id: true,
        empleador_id: true,
        profesor: {
          select: { nombre: true, apellido1: true, apellido2: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        rol: true,
        activo: true,
        created_at: true,
        nombre: true,
        apellido1: true,
        apellido2: true,
        correo: true,
        alumno_id: true,
        profesor_id: true,
        empleador_id: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(data: {
    username: string;
    password: string;
    rol: string;
    nombre?: string;
    apellido1?: string;
    apellido2?: string;
    correo?: string;
    alumno_id?: number;
    profesor_id?: number;
    empleador_id?: number;
  }) {
    const existe = await this.prisma.usuarios.findUnique({
      where: { username: data.username },
    });
    if (existe) throw new ConflictException('El username ya existe');

    const hash = await bcrypt.hash(data.password, 10);
    return this.prisma.usuarios.create({
      data: { ...data, password: hash } as any,
    });
  }

  async update(id: number, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.usuarios.update({
      where: { id },
      data,
    });
  }

  async getMiPerfil(userId: number, rol: string, profesorId?: number, empleadorId?: number) {
    const user = await this.prisma.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, rol: true,
        nombre: true, apellido1: true, apellido2: true, correo: true,
        profesor_id: true, empleador_id: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (rol === 'profesor' && profesorId) {
      const perfil_profesor = await this.prisma.profesores.findUnique({
        where: { id: profesorId },
        select: { id: true, nombre: true, apellido1: true, apellido2: true, tipo: true, correo: true, foto: true, activo: true },
      });
      return { ...user, perfil_profesor };
    }

    if (rol === 'empleador' && empleadorId) {
      const perfil_empleador = await this.prisma.empleadores.findUnique({
        where: { id: empleadorId },
        include: { empresa: { select: { id: true, nombre: true, rut: true, descripcion: true, localidad: true, direccion: true } } },
      });
      return { ...user, perfil_empleador };
    }

    return user;
  }

  async actualizarMiPerfil(userId: number, rol: string, data: any, profesorId?: number, empleadorId?: number) {
    const { perfil_profesor, perfil_empleador, perfil_empresa, password, passwordActual, ...rest } = data;
    const toStr = (v: any) => (v !== '' && v != null) ? String(v) : null;

    const camposUsuario: any = {
      nombre:    toStr(rest.nombre),
      apellido1: toStr(rest.apellido1),
      apellido2: toStr(rest.apellido2),
      correo:    toStr(rest.correo),
    };

    if (password) {
      camposUsuario.password = await bcrypt.hash(password, 10);
    }

    await this.prisma.usuarios.update({
      where: { id: userId },
      data: camposUsuario,
    });

    if (rol === 'profesor' && profesorId && perfil_profesor) {
      await this.prisma.profesores.update({
        where: { id: profesorId },
        data: {
          nombre:    toStr(perfil_profesor.nombre)    ?? undefined,
          apellido1: toStr(perfil_profesor.apellido1) ?? undefined,
          apellido2: toStr(perfil_profesor.apellido2),
          tipo:      toStr(perfil_profesor.tipo),
          correo:    toStr(perfil_profesor.correo),
        },
      });
    }

    if (rol === 'empleador' && empleadorId && perfil_empleador) {
      const empleador = await this.prisma.empleadores.update({
        where: { id: empleadorId },
        data: {
          nombres:   toStr(perfil_empleador.nombres)   ?? undefined,
          apellido1: toStr(perfil_empleador.apellido1) ?? undefined,
          apellido2: toStr(perfil_empleador.apellido2),
          cargo:     toStr(perfil_empleador.cargo),
          correo:    toStr(perfil_empleador.correo)    ?? undefined,
          telefono:  toStr(perfil_empleador.telefono),
        },
      });

      if (perfil_empresa) {
        // El RUT no se edita desde aquí, solo se muestra en modo lectura.
        await this.prisma.empresas.update({
          where: { id: empleador.empresa_id },
          data: {
            descripcion: toStr(perfil_empresa.descripcion),
            localidad:   toStr(perfil_empresa.localidad),
            direccion:   toStr(perfil_empresa.direccion),
          },
        });
      }
    }

    return { ok: true };
  }

  async toggleActivo(id: number) {
    const user = await this.findOne(id);
    return this.prisma.usuarios.update({
      where: { id },
      data: { activo: user.activo === 1 ? 0 : 1 },
    });
  }

  // El RUT (sin puntos/guion) es el username y la contraseña inicial, igual
  // que las cuentas de alumno creadas hasta ahora.
  async crearUsuariosAlumnos() {
    const pendientes = await this.prisma.alumnos.findMany({
      where: { usuario: { none: {} } },
      select: {
        id: true, rut: true, nombres: true, apellido1: true, apellido2: true,
        correo_institucional: true, correo_personal: true,
      },
    });

    let creados = 0;
    const errores: string[] = [];

    for (const a of pendientes) {
      const clave = a.rut.replace(/[^0-9kK]/gi, '').toUpperCase();
      if (!clave) { errores.push(`Alumno ${a.id}: RUT inválido`); continue; }

      const existe = await this.prisma.usuarios.findUnique({ where: { username: clave } });
      if (existe) { errores.push(`Alumno ${a.id} (${a.rut}): el usuario "${clave}" ya existe`); continue; }

      const hash = await bcrypt.hash(clave, 10);
      await this.prisma.usuarios.create({
        data: {
          username:  clave,
          password:  hash,
          rol:       'alumno',
          alumno_id: a.id,
          nombre:    a.nombres,
          apellido1: a.apellido1,
          apellido2: a.apellido2,
          correo:    a.correo_institucional ?? a.correo_personal ?? null,
        },
      });
      creados++;
    }

    return {
      mensaje: `${creados} cuenta(s) creada(s)` + (errores.length ? `, ${errores.length} omitida(s)` : ''),
      creados,
      omitidos: errores.length,
      errores,
    };
  }
}
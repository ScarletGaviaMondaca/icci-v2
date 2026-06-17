import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.usuarios.findUnique({
      where: { username },
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const hash = user.password.replace(/^\$2y\$/, '$2b$');
    const  passwordValid = await bcrypt.compare(password, hash);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      rol: user.rol,
      alumno_id: user.alumno_id,
      profesor_id: user.profesor_id,
      empleador_id: user.empleador_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      rol: user.rol,
      nombre: user.nombre,
      id: user.id,
      alumno_id: user.alumno_id,
      profesor_id: user.profesor_id,
      empleador_id: user.empleador_id,
    };
  }
}
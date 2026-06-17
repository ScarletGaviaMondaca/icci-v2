import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.username,
      rol: payload.rol,
      alumno_id: payload.alumno_id,
      profesor_id: payload.profesor_id,
      empleador_id: payload.empleador_id,
    };
  }
}
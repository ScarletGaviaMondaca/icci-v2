import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AlumnosModule } from './alumnos/alumnos.module';
import { SeguimientoModule } from './seguimiento/seguimiento.module';
import { EmpresasModule } from './empresas/empresas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { OfertasModule } from './ofertas/ofertas.module';
import { MapaModule } from './mapa/mapa.module';
import { GeneradoresModule } from './generadores/generadores.module';
import { EmpleadoresModule } from './empleadores/empleadores.module';
import { SubrogantesModule } from './subrogancias/subrogancias.module';
import { MailModule } from './mail/mail.module';
import { ProfesoresModule } from './profesores/profesores.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    AlumnosModule,
    SeguimientoModule,
    EmpresasModule,
    NotificacionesModule,
    OfertasModule,
    MapaModule,
    GeneradoresModule,
    EmpleadoresModule,
    SubrogantesModule,
    MailModule,
    ProfesoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
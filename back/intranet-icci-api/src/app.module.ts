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
import { DocumentosModule } from './documentos/documentos.module';
import { OrganigramaModule } from './organigrama/organigrama.module';
import { ProfesoresModule } from './profesores/profesores.module';
import { ExalumnosModule } from './exalumnos/exalumnos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { OfertasModule } from './ofertas/ofertas.module';
import { PlanModule } from './plan/plan.module';
import { MapaModule } from './mapa/mapa.module';
import { GeneradoresModule } from './generadores/generadores.module';
import { InfoCarreraModule } from './info-carrera/info-carrera.module';
import { EmpleadoresModule } from './empleadores/empleadores.module';
import { SubrogantesModule } from './subrogancias/subrogancias.module';

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
    DocumentosModule,
    OrganigramaModule,
    ProfesoresModule,
    ExalumnosModule,
    NotificacionesModule,
    OfertasModule,
    PlanModule,
    MapaModule,
    GeneradoresModule,
    InfoCarreraModule,
    EmpleadoresModule,
    SubrogantesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
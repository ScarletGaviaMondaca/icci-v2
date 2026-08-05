import { Controller, Get, Post, Put, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { SubrogantesService } from './subrogancias.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('subrogancias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubrogantesController {
  constructor(private subrogantesService: SubrogantesService) {}

  @Get('activa')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'secretaria_dici', 'director_departamento')
  getActiva(@Query('rol') rol: string) {
    return this.subrogantesService.getActiva(rol || 'jefe_carrera');
  }

  @Post()
  @Roles('admin', 'secretaria', 'secretaria_dici')
  activar(@Body() body: { profesor_id: number; rol_suplido: string }, @Req() req: any) {
    return this.subrogantesService.activar(
      +body.profesor_id, body.rol_suplido, req.user.username ?? 'sistema', req.user.rol,
    );
  }

  @Put(':id/desactivar')
  @Roles('admin', 'secretaria', 'secretaria_dici')
  desactivar(@Param('id') id: string, @Req() req: any) {
    return this.subrogantesService.desactivar(+id, req.user.rol);
  }

  @Get('mi-estado')
  @Roles('profesor')
  getMiEstado(@Req() req: any) {
    return this.subrogantesService.getMiEstado(req.user.profesor_id);
  }
}

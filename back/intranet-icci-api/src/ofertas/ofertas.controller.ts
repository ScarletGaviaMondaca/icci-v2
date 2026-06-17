import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { OfertasService } from './ofertas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ofertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfertasController {
  constructor(private ofertasService: OfertasService) {}

  @Get()
  @Roles('admin', 'secretaria', 'alumno', 'jefe_carrera', 'empleador')
  findAll(
    @Query('empleador_id') empleadorId?: string,
    @Query('alumno_id') alumnoId?: string,
  ) {
    return this.ofertasService.findAll(
      empleadorId ? +empleadorId : undefined,
      alumnoId ? +alumnoId : undefined,
    );
  }

  @Get('verificar-candidato')
  @Roles('admin', 'secretaria', 'alumno', 'jefe_carrera')
  verificarCandidato(@Query('alumno_id') alumnoId: string) {
    return this.ofertasService.verificarCandidato(+alumnoId);
  }

  @Get('todas-postulaciones')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  todasPostulaciones() {
    return this.ofertasService.todasPostulaciones();
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'alumno', 'jefe_carrera', 'empleador')
  findOne(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) throw new NotFoundException('Oferta no encontrada');
    return this.ofertasService.findOne(numId);
  }

  @Post()
  @Roles('admin', 'secretaria', 'empleador')
  create(@Body() body: any) {
    return this.ofertasService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'secretaria', 'empleador')
  update(@Param('id') id: string, @Body() body: any) {
    return this.ofertasService.update(+id, body);
  }

  @Put(':id/toggle')
  @Roles('admin', 'secretaria', 'empleador')
  toggle(@Param('id') id: string) {
    return this.ofertasService.toggleActivo(+id);
  }

  @Post(':id/postular')
  @Roles('alumno')
  postular(
    @Param('id') id: string,
    @Body() body: { alumno_id: number; practica_num: number },
  ) {
    return this.ofertasService.postular(+id, body.alumno_id, body.practica_num);
  }

  @Put('postulaciones/:id')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'empleador')
  responderPostulacion(
    @Param('id') id: string,
    @Body() body: { estado: string; motivo_rechazo?: string },
  ) {
    return this.ofertasService.responderPostulacion(+id, body.estado, body.motivo_rechazo);
  }
}
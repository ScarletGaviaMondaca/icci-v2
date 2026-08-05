import { Controller, Get, Post, Put, Param, Body, Res, UseGuards, Query, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response } from 'express';
import { SeguimientoService } from './seguimiento.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';

@Controller('seguimiento')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeguimientoController {
  constructor(private seguimientoService: SeguimientoService) {}

  @Get('exportar')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  async exportar(@Query() q: any, @Res() res: Response) {
    const pNum = q.practica_num ? +q.practica_num : 1;
    const csv = await this.seguimientoService.exportarCSV({
      practica_num: pNum,
      rut: q.rut,
      nombre: q.nombre,
      plan: q.plan,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="seguimiento_p${pNum}.csv"`);
    res.send('﻿' + csv);
  }

  @Post('importar')
  @Roles('admin', 'secretaria')
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: os.tmpdir() }) }))
  importar(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const pNum = body.practica_num ? +body.practica_num : 1;
    return this.seguimientoService.importarCSV(file, pNum);
  }

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findAll(@Query('practica_num') practica_num?: string) {
    return this.seguimientoService.findAll(practica_num ? +practica_num : 1);
  }

  @Get('alumno/:alumno_id')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  findByAlumno(
    @Param('alumno_id') alumno_id: string,
    @Query('practica_num') practica_num?: string
  ) {
    return this.seguimientoService.findByAlumno(+alumno_id, practica_num ? +practica_num : 1);
  }

  @Get('pendientes')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findPendientes() {
    return this.seguimientoService.findPendientes();
  }
  
  @Get('duraciones')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  getDuraciones() {
    return this.seguimientoService.getDuraciones();
  }

  @Get('candidatos')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  getCandidatos() {
    return this.seguimientoService.getCandidatos();
  }

  @Get('en-curso')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  getEnCurso() {
    return this.seguimientoService.getEnCurso();
  }

  @Get('evaluacion-informes')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'director_departamento')
  getEvaluacionInformes() {
    return this.seguimientoService.getEvaluacionInformes();
  }

  @Get('pendientes-asignacion-academico')
  @Roles('admin', 'director_departamento', 'secretaria_dici')
  getPendientesAsignacionAcademico() {
    return this.seguimientoService.getPendientesAsignacionAcademico();
  }

  @Put('proponer-profesores')
  @Roles('admin', 'director_departamento')
  proponerProfesoresEvaluadores(@Body() body: { asignaciones: { seguimiento_id: number; profesor_id: number }[] }) {
    return this.seguimientoService.proponerProfesoresEvaluadores(body.asignaciones ?? []);
  }

  @Get('listos-para-acta')
  @Roles('admin', 'secretaria_dici')
  getListosParaActa() {
    return this.seguimientoService.getListosParaActa();
  }

  @Get('resumen-profesor-evaluador')
  @Roles('admin', 'director_departamento')
  getResumenProfesorEvaluador() {
    return this.seguimientoService.getResumenProfesorEvaluador();
  }

  @Get('alumnos-evaluados')
  @Roles('admin', 'profesor', 'director_departamento')
  getAlumnosEvaluados() {
    return this.seguimientoService.getAlumnosEvaluados();
  }

  @Get('comite-pendientes')
  @Roles('admin', 'jefe_carrera', 'secretaria')
  getComitePendientes() {
    return this.seguimientoService.getComitePendientes();
  }

  @Get('comite-rechazados')
  @Roles('admin', 'secretaria')
  getComiteRechazados() {
    return this.seguimientoService.getComiteRechazados();
  }

  @Put(':id/comite')
  @Roles('admin', 'jefe_carrera')
  decidirComite(@Param('id') id: string, @Body() body: { decision: 'aprobado' | 'rechazado' }) {
    return this.seguimientoService.decidirComite(+id, body.decision);
  }

  @Get('informes-atrasados')
  @Roles('admin', 'secretaria')
  getInformesAtrasados() {
    return this.seguimientoService.getInformesAtrasados();
  }

  @Put(':id/enviar-comite-atrasado')
  @Roles('admin', 'secretaria')
  enviarComiteAtrasado(@Param('id') id: string) {
    return this.seguimientoService.enviarComiteAtrasado(+id);
  }

  @Delete(':id')
  @Roles('admin', 'secretaria')
  eliminarSeguimiento(@Param('id') id: string) {
    return this.seguimientoService.eliminarSeguimiento(+id);
  }

  @Post('evaluacion-informes/solicitar')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  solicitarProfesorEvaluadorBulk(@Body() body: { seguimiento_ids: number[] }) {
    return this.seguimientoService.solicitarProfesorEvaluadorBulk((body.seguimiento_ids ?? []).map(Number));
  }
  @Get('aprobados')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  getAprobados() {
    return this.seguimientoService.getAprobados();
  }

  @Get('informes')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  getInformes(@Query('rut') rut?: string, @Query('anio') anio?: string) {
    return this.seguimientoService.getInformes(rut, anio);
  }

  @Get('anios')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  getAniosAprobacion() {
    return this.seguimientoService.getAniosAprobacion();
  }

  @Get('verificar-documento')
  @Public()
  verificarDocumento(@Query('codigo') codigo: string) {
    return this.seguimientoService.verificarDocumento(codigo ?? '');
  }

  @Get('verificar-certificado')
  @Public()
  verificarCertificado(@Query('codigo') codigo: string) {
    return this.seguimientoService.verificarCertificado(codigo ?? '');
  }

  @Get('evaluaciones-empleador')
  @Roles('admin', 'secretaria', 'empleador')
  getEvaluacionesEmpleador(@Query('usuario_id') usuario_id: string) {
    return this.seguimientoService.getEvaluacionesEmpleador(+usuario_id);
  }

  @Get('alumnos-empresa')
  @Roles('admin', 'secretaria', 'empleador')
  getAlumnosEmpresa(@Query('usuario_id') usuario_id: string) {
    return this.seguimientoService.getAlumnosEmpresa(+usuario_id);
  }

  @Get(':id/evaluacion')
  @Roles('admin', 'secretaria', 'profesor')
  getEvaluacion(@Param('id') id: string) {
    return this.seguimientoService.getEvaluacion(+id);
  }

  @Get(':id/evaluacion-empresa')
  @Roles('admin', 'secretaria', 'empleador')
  getEvaluacionEmpresa(@Param('id') id: string) {
    return this.seguimientoService.getEvaluacionEmpresa(+id);
  }

  @Post('evaluar-empresa')
  @Roles('admin', 'secretaria', 'empleador')
  evaluarEmpresa(@Body() body: any) {
    return this.seguimientoService.evaluarEmpresa(+body.seguimiento_id, body);
  }

  @Post('evaluar-informe')
  @Roles('admin', 'secretaria', 'profesor')
  @UseInterceptors(FileInterceptor('archivo_feedback', { storage: diskStorage({ destination: os.tmpdir() }) }))
  evaluarInforme(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.seguimientoService.evaluarInforme(+body.seguimiento_id, body, file);
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  findOne(@Param('id') id: string) {
    return this.seguimientoService.findOne(+id);
  }
  @Get(':id/observaciones')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  getObservaciones(@Param('id') id: string) {
    return this.seguimientoService.getObservaciones(+id);
  }
  @Put('observacion/:id')
  @Roles('admin', 'secretaria')
  updateObservacion(@Param('id') id: string, @Body() body: any) {
    return this.seguimientoService.updateObservacion(+id, body);
  }
  @Post()
  @Roles('admin', 'secretaria')
  create(@Body() body: { alumno_id: number; practica_num: number; plan: string }) {
    return this.seguimientoService.create(body.alumno_id, body.practica_num, body.plan);
  }

  @Post('informe')
  @Roles('admin', 'secretaria', 'alumno')
  @UseInterceptors(FileInterceptor('informe', { storage: diskStorage({ destination: os.tmpdir() }) }))
  subirInforme(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.seguimientoService.subirInforme(+body.seguimiento_id, +body.alumno_id, +body.practica_num, file, body.obs_id ? +body.obs_id : undefined);
  }

  @Post('eval-empresa')
  @Roles('admin', 'secretaria')
  @UseInterceptors(FileInterceptor('eval_empresa', { storage: diskStorage({ destination: os.tmpdir() }) }))
  subirEvalEmpresa(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.seguimientoService.subirEvalEmpresa(+body.seguimiento_id, +body.alumno_id, +body.practica_num, file);
  }

  @Post('acta')
  @Roles('admin', 'secretaria')
  @UseInterceptors(FileInterceptor('acta', { storage: diskStorage({ destination: os.tmpdir() }) }))
  subirActaFirmada(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.seguimientoService.subirActaFirmada(+body.seguimiento_id, +body.alumno_id, +body.practica_num, file);
  }
  @Put('campo')
  @Roles('admin', 'secretaria')
  updateCampo(@Body() body: { alumno_id: number; plan: string; practica_num: number; campo: string; valor: any }) {
    return this.seguimientoService.updateCampo(body);
  }
  @Put(':id')
  @Roles('admin', 'secretaria')
  update(@Param('id') id: string, @Body() body: any) {
    return this.seguimientoService.update(+id, body);
  }

  @Put(':id/avanzar/:hito')
  @Roles('admin', 'secretaria')
  avanzar(@Param('id') id: string, @Param('hito') hito: string, @Body() body: any) {
    return this.seguimientoService.avanzarHito(+id, hito, body);
  }

  @Put(':id/aprobar/:hito')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  aprobar(@Param('id') id: string, @Param('hito') hito: string, @Body() body: any) {
    return this.seguimientoService.aprobarHito(+id, hito, body);
  }

  @Put(':id/exceder/:hito')
  @Roles('admin', 'secretaria')
  exceder(@Param('id') id: string, @Param('hito') hito: string) {
    return this.seguimientoService.marcarExcedido(+id, hito);
  }

  @Post(':id/solicitar-profesor')
  @Roles('admin', 'secretaria')
  solicitarProfesorEvaluador(@Param('id') id: string) {
    return this.seguimientoService.solicitarProfesorEvaluador(+id);
  }

  @Put(':id/asignar-profesor')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'director_departamento', 'secretaria_dici')
  asignarProfesorEvaluador(@Param('id') id: string, @Body() body: { profesor_id: number }) {
    return this.seguimientoService.asignarProfesorEvaluador(+id, +body.profesor_id);
  }

  @Post(':id/observacion')
  @Roles('admin', 'secretaria', 'profesor')
  addObservacion(
    @Param('id') id: string,
    @Body() body: { hito: string;[key: string]: any },
  ) {
    return this.seguimientoService.addObservacion(+id, body.hito, body);
  }


}
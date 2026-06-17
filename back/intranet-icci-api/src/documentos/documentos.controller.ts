import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Res, Req } from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('documentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentosController {
  constructor(private documentosService: DocumentosService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  findAll() {
    return this.documentosService.findAll();
  }

  @Get('certificados/me')
  @Roles('alumno')
  getMisCertificados(@Req() req: any) {
    return this.documentosService.getMisCertificados(req.user.alumno_id);
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findOne(@Param('id') id: string) {
    return this.documentosService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'secretaria')
  create(@Body() body: any) {
    return this.documentosService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'secretaria')
  update(@Param('id') id: string, @Body() body: any) {
    return this.documentosService.update(+id, body);
  }

  @Put(':id/toggle')
  @Roles('admin')
  toggle(@Param('id') id: string) {
    return this.documentosService.toggleActivo(+id);
  }

  @Get('certificados/lista')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findCertificados(@Query('rut') rut?: string) {
    return this.documentosService.findCertificados(rut);
  }

  @Post('certificados')
  @Roles('admin', 'secretaria')
  createCertificado(@Body() body: any) {
    return this.documentosService.createCertificado(body);
  }

  @Get('certificados-externos/lista')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno')
  findCertificadosExternos(@Query('alumno_id') alumno_id?: string) {
    return this.documentosService.findCertificadosExternos(
      alumno_id ? +alumno_id : undefined,
    );
  }

  @Post('certificados-externos')
  @Roles('admin', 'secretaria')
  createCertificadoExterno(@Body() body: any) {
    return this.documentosService.createCertificadoExterno(body);
  }

  @Get(':id/descargar')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  async descargar(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentosService.findOne(+id);
    const rutaArchivo = path.join('C:/xampp/htdocs', doc.archivo);
    
    if (!fs.existsSync(rutaArchivo)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    return res.download(rutaArchivo, doc.nombre);
  }
  
  @Get('categorias')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  getCategorias() {
    return this.documentosService.getCategorias();
  }
}
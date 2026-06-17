import { Controller, Get, Post, Put, Delete, Param, Body, Query, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import { AlumnosService } from './alumnos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('alumnos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlumnosController {
  constructor(private alumnosService: AlumnosService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findAll(@Query('tipo') tipo?: string) {
    return this.alumnosService.findAll(tipo);
  }

  @Get('especiales')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findEspeciales() {
    return this.alumnosService.findEspeciales();
  }

  @Get('search')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  search(@Query('q') query: string) {
    return this.alumnosService.search(query);
  }

  @Get('exportar')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  async exportar(@Query() q: any, @Res() res: Response) {
    const csv = await this.alumnosService.exportarCSV({
      rut:       q.rut,
      nombre:    q.nombre,
      apellidos: q.apellidos,
      plan:      q.plan,
      anio:      q.anio,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="alumnos.csv"');
    res.send('﻿' + csv);
  }

  @Get('rut/:rut')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findByRut(@Param('rut') rut: string) {
    return this.alumnosService.findByRut(rut);
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno')
  findOne(@Param('id') id: string) {
    return this.alumnosService.findOne(+id);
  }

  @Post('importar')
  @Roles('admin', 'secretaria')
  @UseInterceptors(FileInterceptor('archivo_csv', { storage: diskStorage({ destination: os.tmpdir() }) }))
  async importar(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    if (!file) return res.status(400).json({ estado: 'error', mensaje: 'No se recibió archivo' });
    const resultado = await this.alumnosService.importarCSV(file);
    return res.json(resultado);
  }

  @Post()
  @Roles('admin', 'secretaria')
  create(@Body() body: any) {
    return this.alumnosService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'secretaria')
  update(@Param('id') id: string, @Body() body: any) {
    return this.alumnosService.update(+id, body);
  }

  @Delete(':id')
  @Roles('admin', 'secretaria')
  remove(@Param('id') id: string) {
    return this.alumnosService.remove(+id);
  }
}
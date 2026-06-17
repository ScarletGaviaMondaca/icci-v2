import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Res, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import { PlanService } from './plan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('plan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanController {
  constructor(private planService: PlanService) {}

  // Rutas estaticas PRIMERO (antes de :id)

  @Get('plantilla-restricciones')
  @Roles('admin', 'jefe_carrera')
  descargarPlantilla(@Res() res: Response) {
    const csv = 'plan_id,ramo_codigo,req_codigo,tipo\n1,CODIGO_A,CODIGO_B,PRE\n1,CODIGO_C,CODIGO_D,CO\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_restricciones_malla.csv"');
    res.send(csv);
  }

  @Post('restricciones')
  @Roles('admin', 'jefe_carrera')
  crearRestriccion(@Body() body: { plan_id: number; ramo_codigo: string; req_codigo: string; tipo: 'PRE' | 'CO' }) {
    return this.planService.crearRestriccion(body);
  }

  @Delete('restricciones/:id')
  @Roles('admin', 'jefe_carrera')
  eliminarRestriccion(@Param('id') id: string) {
    return this.planService.eliminarRestriccion(+id);
  }

  @Post('importar-malla')
  @Roles('admin', 'jefe_carrera')
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: os.tmpdir() }) }))
  importarMalla(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.planService.importarMalla(+body.plan_id, file);
  }

  @Post('importar-restricciones')
  @Roles('admin', 'jefe_carrera')
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: os.tmpdir() }) }))
  importarRestricciones(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.planService.importarRestricciones(+body.plan_id, file);
  }

  // CRUD general

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(+id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: any) {
    return this.planService.create(body);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: any) {
    return this.planService.update(+id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.planService.remove(+id);
  }

  // Sub-rutas de :id

  @Get(':id/malla')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  getMalla(@Param('id') id: string) {
    return this.planService.getMalla(+id);
  }

  @Get(':id/restricciones')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  getRestricciones(@Param('id') id: string) {
    return this.planService.getRestricciones(+id);
  }

  @Get(':id/exportar-pdf')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor')
  async exportarPDF(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.planService.exportarMallaPDF(+id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="malla_plan_${id}.pdf"`);
    res.send(buffer);
  }
}

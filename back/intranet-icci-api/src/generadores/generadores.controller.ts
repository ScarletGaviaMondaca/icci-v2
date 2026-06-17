import { Controller, Get, Post, Body, Query, Res, Req, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { GeneradoresService } from './generadores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('generadores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeneradoresController {
  constructor(private generadoresService: GeneradoresService) {}

  @Get('acta')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  async generarActa(
    @Query('seguimiento_id') seguimiento_id: string,
    @Query('calificacion') calificacion: string = 'APROBADO',
    @Query('semestre') semestre: string = '',
    @Query('registradora') registradora: string = 'MARLENE CISTERNAS RIVEROS',
    @Res() res: Response,
  ) {
    const buffer = await this.generadoresService.generarActa(
      +seguimiento_id, calificacion, semestre, registradora
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Acta_P${seguimiento_id}.docx"`);
    res.send(buffer);
  }

  @Post('certificado')
  @Roles('admin', 'secretaria')
  async generarCertificado(
    @Body() body: { alumno_rut: string; practica_num: number },
    @Req() req: any,
  ) {
    return this.generadoresService.generarCertificado(
      body.alumno_rut,
      +body.practica_num,
      req.user.username ?? 'sistema',
    );
  }

  @Get('informe-confidencial')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  async generarInformeConfidencial(
    @Query('seguimiento_id') seguimiento_id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.generadoresService.generarInformeConfidencial(+seguimiento_id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="InformeConfidencial_${seguimiento_id}.pdf"`);
    res.send(buffer);
  }

  @Get('formulario-revision')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'profesor')
  async generarFormularioRevision(
    @Query('seguimiento_id') seguimiento_id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.generadoresService.generarFormularioRevision(+seguimiento_id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Formulario_Revision_${seguimiento_id}.pdf"`);
    res.send(buffer);
  }

  @Get('carta-solicitud')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  async generarCarta(
    @Query('seguimiento_id') seguimiento_id: string,
    @Res() res: Response,
  ) {
    const { buffer, ruta } = await this.generadoresService.generarCartaSolicitud(+seguimiento_id);

    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, ruta });
  }
}
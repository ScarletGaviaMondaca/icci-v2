import {
  Controller, Get, Post, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { EmpleadoresService } from './empleadores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const COMPROMISO_PATH = path.join(process.cwd(), 'uploads', 'compromisos', 'compromiso.pdf');

@Controller('empleadores')
export class EmpleadoresController {
  constructor(private empleadoresService: EmpleadoresService) {}

  // ── Públicos (sin auth — flujo de registro) ───────────────────────

  @Get('validar-token')
  validarToken(@Query('token') token: string) {
    return this.empleadoresService.validarToken(token);
  }

  @Post('registro')
  registrar(@Body() body: any) {
    return this.empleadoresService.registrar(body);
  }

  @Get('empresas')
  listarEmpresas() {
    return this.empleadoresService.listarEmpresas();
  }

  @Post('empresas')
  crearEmpresa(@Body() body: { nombre: string; rut: string; descripcion?: string; localidad?: string }) {
    return this.empleadoresService.crearEmpresa(body.nombre, body.rut, body.descripcion, body.localidad);
  }

  @Get('compromiso')
  getCompromiso() {
    return this.empleadoresService.getCompromisoInfo();
  }

  @Get('compromiso/ver')
  verCompromiso(@Res() res: Response) {
    if (!fs.existsSync(COMPROMISO_PATH)) {
      return res.status(404).json({ error: 'No hay documento cargado' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="compromiso.pdf"');
    fs.createReadStream(COMPROMISO_PATH).pipe(res);
  }

  // ── Protegidos ────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'secretaria', 'jefe_carrera')
  listar() {
    return this.empleadoresService.listar();
  }

  @Post('generar-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'secretaria')
  generarToken(@Body('correo') correo: string) {
    return this.empleadoresService.generarToken(correo);
  }

  @Post('compromiso/subir')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'secretaria')
  @UseInterceptors(FileInterceptor('archivo', { storage: diskStorage({ destination: os.tmpdir() }) }))
  subirCompromiso(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    if (!file) return res.status(400).json({ error: 'No se recibió archivo' });
    const result = this.empleadoresService.guardarCompromiso(file);
    return res.json(result);
  }
}

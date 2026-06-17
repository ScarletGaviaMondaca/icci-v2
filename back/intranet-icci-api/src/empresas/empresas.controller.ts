import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresasController {
  constructor(private empresasService: EmpresasService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findAll() {
    return this.empresasService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findOne(@Param('id') id: string) {
    return this.empresasService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'secretaria')
  create(@Body() body: any) {
    return this.empresasService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'secretaria')
  update(@Param('id') id: string, @Body() body: any) {
    return this.empresasService.update(+id, body);
  }

  @Put(':id/toggle')
  @Roles('admin', 'secretaria')
  toggle(@Param('id') id: string) {
    return this.empresasService.toggleActivo(+id);
  }

  @Get(':id/empleadores')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findEmpleadores(@Param('id') id: string) {
    return this.empresasService.findEmpleadores(+id);
  }

  @Post('empleadores')
  @Roles('admin', 'secretaria')
  createEmpleador(@Body() body: any) {
    return this.empresasService.createEmpleador(body);
  }

  @Put('empleadores/:id')
  @Roles('admin', 'secretaria')
  updateEmpleador(@Param('id') id: string, @Body() body: any) {
    return this.empresasService.updateEmpleador(+id, body);
  }
}
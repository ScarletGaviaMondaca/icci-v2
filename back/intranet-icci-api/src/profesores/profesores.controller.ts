import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ProfesoresService } from './profesores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('profesores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfesoresController {
  constructor(private profesoresService: ProfesoresService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor', 'empleador', 'director_departamento', 'secretaria_dici')
  findAll(@Query('soloActivos') soloActivos?: string) {
    return this.profesoresService.findAll(soloActivos === '1');
  }

  @Get(':id')
  @Roles('admin', 'secretaria')
  findOne(@Param('id') id: string) {
    return this.profesoresService.findOne(+id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: any) {
    return this.profesoresService.create(body);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: any) {
    return this.profesoresService.update(+id, body);
  }

  @Put(':id/toggle')
  @Roles('admin')
  toggle(@Param('id') id: string) {
    return this.profesoresService.toggleActivo(+id);
  }
}
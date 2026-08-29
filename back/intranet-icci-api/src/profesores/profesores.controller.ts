import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}

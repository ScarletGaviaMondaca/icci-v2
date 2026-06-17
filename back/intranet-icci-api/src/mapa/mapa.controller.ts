import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MapaService } from './mapa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('mapa')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapaController {
  constructor(private mapaService: MapaService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor', 'empleador')
  findAll() {
    return this.mapaService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor', 'empleador')
  findOne(@Param('id') id: string) {
    return this.mapaService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: any) {
    return this.mapaService.create(body);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: any) {
    return this.mapaService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.mapaService.remove(id);
  }
}
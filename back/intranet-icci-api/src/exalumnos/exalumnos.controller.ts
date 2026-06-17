import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ExalumnosService } from './exalumnos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('exalumnos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExalumnosController {
  constructor(private exalumnosService: ExalumnosService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findAll() {
    return this.exalumnosService.findAll();
  }

  @Get('search')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  search(@Query('q') query: string) {
    return this.exalumnosService.search(query);
  }

  @Get('rut/:rut')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findByRut(@Param('rut') rut: string) {
    return this.exalumnosService.findByRut(rut);
  }

  @Get(':id')
  @Roles('admin', 'secretaria', 'jefe_carrera')
  findOne(@Param('id') id: string) {
    return this.exalumnosService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'secretaria')
  create(@Body() body: any) {
    return this.exalumnosService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'secretaria')
  update(@Param('id') id: string, @Body() body: any) {
    return this.exalumnosService.update(+id, body);
  }

  @Delete(':id')
  @Roles('admin', 'secretaria')
  remove(@Param('id') id: string) {
    return this.exalumnosService.remove(+id);
  }
}
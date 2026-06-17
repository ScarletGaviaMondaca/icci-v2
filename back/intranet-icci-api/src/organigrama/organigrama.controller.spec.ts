import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OrganigramaService } from './organigrama.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('organigrama')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganigramaController {
  constructor(private organigramaService: OrganigramaService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor', 'empleador')
  findAll() {
    return this.organigramaService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'secretaria')
  findOne(@Param('id') id: string) {
    return this.organigramaService.findOne(+id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: any) {
    return this.organigramaService.create(body);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: any) {
    return this.organigramaService.update(+id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.organigramaService.remove(+id);
  }
}
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { InfoCarreraService } from './info-carrera.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('info-carrera')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InfoCarreraController {
  constructor(private infoCarreraService: InfoCarreraService) {}

  @Get()
  @Roles('admin', 'secretaria', 'jefe_carrera', 'alumno', 'profesor', 'empleador')
  findOne() {
    return this.infoCarreraService.findOne();
  }

  @Put()
  @Roles('admin', 'jefe_carrera')
  update(@Body() body: any) {
    return this.infoCarreraService.update(body);
  }
}

import { Controller, Get, Post, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get('me')
  getMiPerfil(@Req() req: any) {
    const u = req.user;
    return this.usuariosService.getMiPerfil(u.id, u.rol, u.profesor_id, u.empleador_id);
  }

  @Put('me')
  actualizarMiPerfil(@Req() req: any, @Body() body: any) {
    const u = req.user;
    return this.usuariosService.actualizarMiPerfil(u.id, u.rol, body, u.profesor_id, u.empleador_id);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: any) {
    return this.usuariosService.create(body);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usuariosService.update(+id, body);
  }

  @Put(':id/toggle')
  @Roles('admin')
  toggle(@Param('id') id: string) {
    return this.usuariosService.toggleActivo(+id);
  }
}
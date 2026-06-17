import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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

  @Post()
  @Roles('admin')
  @UseInterceptors(FileInterceptor('foto', {
    storage: diskStorage({
      destination: 'C:/xampp/htdocs/api/uploads/profesores',
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `organigrama_${unique}${extname(file.originalname)}`);
      },
    }),
  }))
  create(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const fotoUrl = file ? `uploads/profesores/${file.filename}` : null;
    return this.organigramaService.create({ ...body, foto: fotoUrl });
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('foto', {
    storage: diskStorage({
      destination: 'C:/xampp/htdocs/api/uploads/profesores',
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `organigrama_${unique}${extname(file.originalname)}`);
      },
    }),
  }))
  update(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const fotoUrl = file ? `uploads/profesores/${file.filename}` : undefined;
    return this.organigramaService.update(+id, { ...body, ...(fotoUrl ? { foto: fotoUrl } : {}) });
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.organigramaService.remove(+id);
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MapaService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.campus_buildings.findMany({
      orderBy: { label: 'asc' },
    });
  }

  async findOne(id: string) {
    const edificio = await this.prisma.campus_buildings.findUnique({
      where: { id },
    });
    if (!edificio) throw new NotFoundException('Edificio no encontrado');
    return edificio;
  }

  async create(data: any) {
    return this.prisma.campus_buildings.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.campus_buildings.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campus_buildings.delete({ where: { id } });
  }
}
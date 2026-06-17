import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.documentos.findMany({
      where: { activo: 1 },
      orderBy: { categoria: 'asc' },
    });
  }

  async findOne(id: number) {
    const doc = await this.prisma.documentos.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async create(data: any) {
    return this.prisma.documentos.create({ data });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    return this.prisma.documentos.update({ where: { id }, data });
  }

  async toggleActivo(id: number) {
    const doc = await this.findOne(id);
    return this.prisma.documentos.update({
      where: { id },
      data: { activo: doc.activo === 1 ? 0 : 1 },
    });
  }

  async getMisCertificados(alumno_id: number) {
    const alumno = await this.prisma.alumnos.findUnique({
      where: { id: alumno_id },
      select: { rut: true },
    });
    if (!alumno) return { practicas: [], externos: [] };

    const practicasRaw = await this.prisma.$queryRaw<any[]>`
      SELECT
        c.id,
        c.alumno_rut            AS rut,
        c.practica_num,
        c.ruta_archivo          AS pdf_url,
        c.fecha_creacion,
        COALESCE(e.nombre, sp.practica1_empresa) AS empresa,
        sp.practica1_fecha_inicio               AS fecha_inicio,
        sp.practica1_fecha_termino              AS fecha_termino,
        COALESCE(sp.practica1_horas_tot, 0)    AS horas_totales
      FROM certificados c
      JOIN alumnos a ON a.rut = c.alumno_rut
      JOIN seguimiento_practica sp
        ON sp.alumno_id = a.id AND sp.practica_num = c.practica_num
      LEFT JOIN empresas e ON e.id = sp.empresa_id
      WHERE c.alumno_rut = ${alumno.rut}
      ORDER BY c.fecha_creacion DESC
    `;

    const practicas = practicasRaw.map((r: any) => ({
      ...r,
      practica_num:  Number(r.practica_num),
      horas_totales: Number(r.horas_totales),
    }));

    const externos = await this.prisma.certificados_externos.findMany({
      where: { alumno_id },
      orderBy: { fecha_subida: 'desc' },
    });

    return { practicas, externos };
  }

  // Certificados
  async findCertificados(alumno_rut?: string) {
    return this.prisma.certificados.findMany({
      where: alumno_rut ? { alumno_rut } : undefined,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async createCertificado(data: any) {
    return this.prisma.certificados.create({ data });
  }

  // Certificados externos
  async findCertificadosExternos(alumno_id?: number) {
    return this.prisma.certificados_externos.findMany({
      where: alumno_id ? { alumno_id } : undefined,
      orderBy: { fecha_subida: 'desc' },
    });
  }

  async createCertificadoExterno(data: any) {
    return this.prisma.certificados_externos.create({ data });
  }
  async getCategorias() {
    const docs = await this.prisma.documentos.findMany({
      where: { activo: 1 },
      select: { categoria: true },
      distinct: ['categoria'],
    });
    return docs.map(d => d.categoria);
  }
  getDescargaUrl(id: number): string {
    // Primero obtener la ruta del documento
    return `http://localhost/uploads/documentos/${id}`;
  }
}
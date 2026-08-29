import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { EmpresaService } from '../../servicios/empresa.service';

@Component({
  selector: 'app-lista-empresas',
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-empresas.html',
  styleUrl: './lista-empresas.css'
})
export class ListaEmpresas implements OnInit {
  datos: any[] = [];
  cargando = false;
  error: string | null = null;
  filtroEmpresa = '';
  filtroAlumno = '';
  paginaActual = 1;
  itemsPorPagina = 20;

  constructor(
    private svc: EmpresaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.cargar(); }

 cargar() {
    this.cargando = true;
    this.svc.listaConAlumnos().subscribe({
      next: (data: any[]) => {
        // Aplanar: por cada empresa, crear una fila por cada seguimiento
        const filas: any[] = [];
        data.forEach(emp => {
          if (emp.seguimientos && emp.seguimientos.length > 0) {
            emp.seguimientos.forEach((seg: any) => {
              filas.push({
                seguimiento_id: seg.id,
                empresa: emp.nombre,
                nombres: seg.alumno?.nombres ?? '',
                apellido1: seg.alumno?.apellido1 ?? '',
                apellido2: seg.alumno?.apellido2 ?? '',
                jefe: seg.practica1_jefe ?? '',
                supervisor: seg.practica1_supervisor ?? '',
                correo: seg.practica1_correo ?? '',
                telefono: seg.practica1_telefono ?? '',
              });
            });
          } else {
            // Empresa sin alumnos
            filas.push({
              seguimiento_id: emp.id,
              empresa: emp.nombre,
              nombres: '',
              apellido1: '',
              apellido2: '',
              jefe: '',
              supervisor: '',
              correo: '',
              telefono: '',
            });
          }
        });
        this.datos = filas;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los datos';
        this.cargando = false;
      }
    });
  }

  filtrados() {
    const emp = this.filtroEmpresa.toLowerCase();
    const alu = this.filtroAlumno.toLowerCase();
    return this.datos.filter(d =>
      (!emp || d.empresa?.toLowerCase().includes(emp)) &&
      (!alu || `${d.nombres} ${d.apellido1} ${d.apellido2}`.toLowerCase().includes(alu))
    );
  }

  paginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.filtrados().slice(inicio, inicio + this.itemsPorPagina);
  }

  totalPaginas() {
    return Math.max(1, Math.ceil(this.filtrados().length / this.itemsPorPagina));
  }

  paginasArray() {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }

  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas()) this.paginaActual = p;
  }

  trackBy(index: number, item: any) { return item.seguimiento_id; }

  private nombreAlumno(d: any): string {
    return `${d.nombres ?? ''} ${d.apellido1 ?? ''} ${d.apellido2 ?? ''}`.trim();
  }

  exportarExcel() {
    const datos = this.filtrados();
    if (datos.length === 0) { alert('No hay datos para exportar'); return; }

    const filas = datos.map(d => ({
      Empresa: d.empresa || '',
      Alumno: this.nombreAlumno(d),
      Jefe: d.jefe || '',
      Supervisor: d.supervisor || '',
      Correo: d.correo || '',
      Teléfono: d.telefono || '',
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 16 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Empresas');
    XLSX.writeFile(libro, 'empresas.xlsx');
  }

  exportarPDF() {
    const datos = this.filtrados();
    if (datos.length === 0) { alert('No hay datos para exportar'); return; }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 30;
    const azulUta: [number, number, number] = [5, 65, 130];
    const rowHeight = 20;
    const headerRowY = 82;
    const bottomMargin = 40;

    const columnas = [
      { label: 'Empresa', width: 140 },
      { label: 'Alumno', width: 150 },
      { label: 'Jefe', width: 110 },
      { label: 'Supervisor', width: 110 },
      { label: 'Correo', width: 150 },
      { label: 'Teléfono', width: 90 },
    ];
    const tablaAncho = columnas.reduce((s, c) => s + c.width, 0);
    const tablaX = (pageWidth - tablaAncho) / 2;

    const fechaGeneracion = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const filasPorPagina = Math.floor((pageHeight - headerRowY - rowHeight - bottomMargin) / rowHeight);
    const totalPaginas = Math.max(1, Math.ceil(datos.length / filasPorPagina));
    let paginaActual = 1;

    const dibujarEncabezadoPagina = () => {
      // Barra superior con el color institucional
      doc.setFillColor(...azulUta);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Listado de Empresas — Acreditación ICCI', marginX, 32);

      doc.setTextColor(90, 90, 90);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el ${fechaGeneracion} · ${datos.length} registro(s)`, marginX, 68);

      // Encabezado de la tabla
      doc.setFillColor(230, 236, 245);
      doc.rect(tablaX, headerRowY, tablaAncho, rowHeight, 'F');
      doc.setDrawColor(...azulUta);
      doc.rect(tablaX, headerRowY, tablaAncho, rowHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...azulUta);
      let x = tablaX;
      columnas.forEach(c => { doc.text(c.label, x + 6, headerRowY + 14); x += c.width; });
      doc.setFont('helvetica', 'normal');
    };

    const dibujarPiePagina = () => {
      doc.setDrawColor(220, 220, 220);
      doc.line(marginX, pageHeight - 32, pageWidth - marginX, pageHeight - 32);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Sistema de Prácticas ICCI · Universidad de Tarapacá', marginX, pageHeight - 18);
      doc.text(`Página ${paginaActual} de ${totalPaginas}`, pageWidth - marginX - 70, pageHeight - 18);
    };

    dibujarEncabezadoPagina();
    let y = headerRowY + rowHeight;

    datos.forEach((d, i) => {
      if (y + rowHeight > pageHeight - bottomMargin) {
        dibujarPiePagina();
        doc.addPage();
        paginaActual++;
        dibujarEncabezadoPagina();
        y = headerRowY + rowHeight;
      }

      // Filas alternadas (zebra) para que sea más fácil de leer impreso
      if (i % 2 === 1) {
        doc.setFillColor(245, 248, 252);
        doc.rect(tablaX, y, tablaAncho, rowHeight, 'F');
      }

      const valores = [d.empresa, this.nombreAlumno(d), d.jefe, d.supervisor, d.correo, d.telefono];
      let x = tablaX;
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      columnas.forEach((c, ci) => {
        const texto = doc.splitTextToSize(String(valores[ci] || '—'), c.width - 10)[0] ?? '';
        doc.text(texto, x + 6, y + 14);
        x += c.width;
      });

      doc.setDrawColor(215, 222, 233);
      doc.rect(tablaX, y, tablaAncho, rowHeight);

      y += rowHeight;
    });

    dibujarPiePagina();
    doc.save('empresas.pdf');
  }
}
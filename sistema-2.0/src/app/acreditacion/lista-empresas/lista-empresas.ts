import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  exportarExcel() {
    const datos = this.filtrados();
    this.exportar(datos, 'excel');
  }

  exportarPDF() {
    const datos = this.filtrados();
    this.exportar(datos, 'pdf');
  }

  exportar(datos: any[], tipo: string) {
    console.log('Exportar pendiente de implementar en NestJS');
    alert('Exportación pendiente de implementar');
  }
}
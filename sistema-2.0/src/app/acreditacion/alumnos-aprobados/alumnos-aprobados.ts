import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-alumnos-aprobados',
  imports: [CommonModule, FormsModule],
  templateUrl: './alumnos-aprobados.html',
  styleUrl: './alumnos-aprobados.css',
})
export class AlumnosAprobados implements OnInit{
  practicantes1: any[] = [];
  practicantes2: any[] = [];
  cargando = false;
  mensaje: string | null = null;
  practicaSeleccionada: number = 1;
  paginaActual = 1;
  itemsPorPagina = 20;
  filtroNombre = '';
  filtroApellidos = '';
  filtroAnio = '';
  filtroRut = '';
  aniosDisponibles: number[] = [];


  constructor(
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarAprobados();
    this.seg.getAniosAprobacion().subscribe({
      next: (anios) => { this.aniosDisponibles = anios; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  cargarAprobados() {
    this.cargando = true;
    this.seg.getAprobados(this.filtroRut, this.filtroAnio).subscribe({
      next: (data) => {
        this.practicantes1 = data.practica1 || [];
        this.practicantes2 = data.practica2 || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensaje = 'Error al cargar: ' + (err.message || JSON.stringify(err));
        this.cargando = false;
      }
    });
  }
  buscar() {
    this.paginaActual = 1;
    this.cargarAprobados();
  }

  limpiar() {
    this.filtroRut  = '';
    this.filtroAnio = '';
    this.cargarAprobados();
  }

  seleccionarPractica(n: number) {
    this.practicaSeleccionada = n;
    this.paginaActual = 1; // resetea la página al cambiar de práctica
  }

  
  datosPaginados() {
    const datos = this.practicaSeleccionada === 1 ? this.practicantes1 : this.practicantes2;
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return datos.slice(inicio, inicio + this.itemsPorPagina);
  }

  totalPaginas(): number {
    const datos = this.practicaSeleccionada === 1 ? this.practicantes1 : this.practicantes2;
    return Math.ceil(datos.length / this.itemsPorPagina);
  }

  paginasArray(): number[] {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }

  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas()) this.paginaActual = p;
  }

  trackByPagina(index: number, p: number) {
    return p;
  }

}


import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoService } from '../../servicios/seguimiento.service';

@Component({
  selector: 'app-alumnos-evaluados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumnos-evaluados.html',
  styleUrl: './alumnos-evaluados.css',
})
export class AlumnosEvaluados implements OnInit {
  alumnos: any[] = [];
  cargando = false;
  error = '';

  filtroProfesor = '';

  resultadoLabels: Record<string, string> = {
    a: 'Aprobado sin observaciones',
    b: 'Aprobado con observaciones',
    c: 'Debe reformularse',
    d: 'Rechazado',
  };

  resultadoClases: Record<string, string> = {
    a: 'badge bg-success',
    b: 'badge bg-info text-dark',
    c: 'badge bg-warning text-dark',
    d: 'badge bg-danger',
  };

  constructor(
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.seg.getAlumnosEvaluados().subscribe({
      next: (data) => {
        this.alumnos = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los alumnos evaluados';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get profesoresDisponibles(): string[] {
    const nombres = this.alumnos
      .map(a => a.profesor_nombre?.trim())
      .filter((n): n is string => !!n);
    return [...new Set(nombres)].sort((a, b) => a.localeCompare(b));
  }

  get alumnosFiltrados(): any[] {
    if (!this.filtroProfesor) return this.alumnos;
    return this.alumnos.filter(a => a.profesor_nombre?.trim() === this.filtroProfesor);
  }
}

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-comite-carrera',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comite-carrera.html',
  styleUrl: './comite-carrera.css',
})
export class ComiteCarrera implements OnInit {
  alumnos: any[] = [];
  rechazados: any[] = [];
  cargando = false;
  error = '';
  mensaje = '';
  decidiendoId: number | null = null;
  eliminandoId: number | null = null;

  esAtrasado(alumno: any): boolean {
    return alumno.informe_atrasado === 2 || alumno.practica1_atrasada === 2;
  }

  constructor(
    private seg: SeguimientoService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
    if (this.auth.esSecretaria()) {
      this.cargarRechazados();
    }
  }

  cargar() {
    this.cargando = true;
    this.seg.getComitePendientes().subscribe({
      next: (data) => {
        this.alumnos = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los alumnos';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarRechazados() {
    this.seg.getComiteRechazados().subscribe({
      next: (data) => {
        this.rechazados = data || [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  decidir(alumno: any, decision: 'aprobado' | 'rechazado') {
    const accion = decision === 'aprobado' ? 'APROBAR' : 'RECHAZAR';
    if (!confirm(`¿Confirmas ${accion} la práctica de ${alumno.nombres} ${alumno.apellido1} según el comité de carrera?`)) return;

    this.decidiendoId = alumno.seguimiento_id;
    this.error = '';
    this.seg.decidirComite(alumno.seguimiento_id, decision).subscribe({
      next: () => {
        this.alumnos = this.alumnos.filter(a => a.seguimiento_id !== alumno.seguimiento_id);
        this.mensaje = `✅ Práctica de ${alumno.nombres} ${alumno.apellido1} marcada como ${decision.toUpperCase()} por el comité`;
        this.decidiendoId = null;
        setTimeout(() => this.mensaje = '', 4000);
        this.cdr.detectChanges();
        if (decision === 'rechazado' && this.auth.esSecretaria()) {
          this.cargarRechazados();
        }
      },
      error: () => {
        this.error = '❌ Error al registrar la decisión del comité';
        this.decidiendoId = null;
      },
    });
  }

  eliminarAvance(alumno: any) {
    if (!confirm(`¿Eliminar todo el avance de ${alumno.nombres} ${alumno.apellido1}? Esta acción no se puede deshacer y el alumno volverá a ser candidato para postular desde cero.`)) return;

    this.eliminandoId = alumno.seguimiento_id;
    this.error = '';
    this.seg.eliminarSeguimiento(alumno.seguimiento_id).subscribe({
      next: () => {
        this.rechazados = this.rechazados.filter(a => a.seguimiento_id !== alumno.seguimiento_id);
        this.mensaje = `🗑️ Se eliminó el avance de ${alumno.nombres} ${alumno.apellido1}`;
        this.eliminandoId = null;
        setTimeout(() => this.mensaje = '', 4000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '❌ Error al eliminar el avance del alumno';
        this.eliminandoId = null;
      },
    });
  }
}

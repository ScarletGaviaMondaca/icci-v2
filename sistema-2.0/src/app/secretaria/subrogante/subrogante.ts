import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubrogantesService } from '../../servicios/subrogancias.service';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-subrogante',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subrogante.html',
  styleUrl: './subrogante.css',
})
export class Subrogante implements OnInit {
  activa: any = null;
  profesores: any[] = [];
  profesorSeleccionado: number | null = null;
  cargando = false;
  error = '';
  mensaje = '';
  procesando = false;

  constructor(
    private subrogantes: SubrogantesService,
    private seg: SeguimientoService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** A quién le gestiona la subrogancia cada secretaría: DICI → director, ICCI → jefe de carrera. */
  get rolSuplido(): string {
    return this.auth.esSecretariaDici() ? 'director_departamento' : 'jefe_carrera';
  }

  get tituloRol(): string {
    return this.auth.esSecretariaDici() ? 'Director de Departamento' : 'Jefe de Carrera';
  }

  ngOnInit() {
    this.cargar();
    this.seg.getProfesores().subscribe(profArr => {
      this.profesores = profArr;
      this.cdr.detectChanges();
    });
  }

  cargar() {
    this.cargando = true;
    this.subrogantes.getActiva(this.rolSuplido).subscribe({
      next: (data) => {
        this.activa = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar el estado de subrogancia';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  activar() {
    if (!this.profesorSeleccionado) return;
    const prof = this.profesores.find(p => p.id === this.profesorSeleccionado);
    const nombre = prof ? `${prof.nombre} ${prof.apellido1 || ''} ${prof.apellido2 || ''}`.trim() : '';
    if (!confirm(`¿Designar a ${nombre} como subrogante del ${this.tituloRol}? Tendrá acceso a todas las vistas y firmará los documentos en su lugar mientras esté activo.`)) return;

    this.procesando = true;
    this.error = '';
    this.subrogantes.activar(this.profesorSeleccionado, this.rolSuplido).subscribe({
      next: (data) => {
        this.activa = data;
        this.profesorSeleccionado = null;
        this.mensaje = `✅ ${nombre} fue designado subrogante`;
        this.procesando = false;
        setTimeout(() => this.mensaje = '', 4000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || '❌ Error al activar la subrogancia';
        this.procesando = false;
        this.cdr.detectChanges();
      },
    });
  }

  desactivar() {
    if (!this.activa) return;
    if (!confirm(`¿Desactivar la subrogancia actual? El profesor dejará de tener acceso a las vistas del ${this.tituloRol.toLowerCase()} y este volverá a aparecer en las firmas.`)) return;

    this.procesando = true;
    this.error = '';
    this.subrogantes.desactivar(this.activa.id).subscribe({
      next: () => {
        this.activa = null;
        this.mensaje = '✅ Subrogancia desactivada';
        this.procesando = false;
        setTimeout(() => this.mensaje = '', 4000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '❌ Error al desactivar la subrogancia';
        this.procesando = false;
        this.cdr.detectChanges();
      },
    });
  }
}

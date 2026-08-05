import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfertasService } from '../../servicios/ofertas.service';

@Component({
  selector: 'app-evaluar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluar.html',
  styleUrl: './evaluar.css',
})
export class Evaluar implements OnInit {
  postulaciones: any[] = [];
  cargando = false;
  error = '';
  mensaje = '';
  evaluandoId: number | null = null;
  observaciones: { [postulacionId: number]: string } = {};

  constructor(
    private svc: OfertasService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.svc.listarTodasPostulaciones().subscribe({
      next: (data) => {
        this.postulaciones = (data || []).map(p => ({
          ...p,
          apellidos: `${p.apellido1 ?? ''} ${p.apellido2 ?? ''}`.trim(),
        }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar las postulaciones';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  evaluar(postulacion: any, cumple: boolean) {
    const comentario = (this.observaciones[postulacion.id] ?? '').trim();

    if (!cumple && !comentario) {
      this.error = '🚫 Debes indicar una observación explicando por qué no cumple los requisitos.';
      return;
    }

    const accion = cumple ? 'cumple' : 'no cumple';
    if (!confirm(`¿Confirmar que ${postulacion.nombres} ${postulacion.apellido1} ${accion} los requisitos?`)) return;

    this.error = '';
    this.evaluandoId = postulacion.id;
    this.svc.evaluarPostulacion(postulacion.id, cumple, comentario).subscribe({
      next: () => {
        this.mensaje = `✅ Postulación de ${postulacion.nombres} evaluada — pasa al jefe de carrera`;
        this.evaluandoId = null;
        this.cargar();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al evaluar';
        this.evaluandoId = null;
      },
    });
  }
}

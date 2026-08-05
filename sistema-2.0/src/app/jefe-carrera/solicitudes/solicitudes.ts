import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OfertasService } from '../../servicios/ofertas.service';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css',
})
export class Solicitudes implements OnInit {
  solicitudes: any[] = [];
  cargando = false;
  error = '';
  mensaje = '';
  resolviendoId: number | null = null;

  mostrarModalRechazo = false;
  motivoRechazo = '';
  solicitudSeleccionada: any = null;

  constructor(
    private svc: OfertasService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.svc.listarPostulacionesEvaluadas().subscribe({
      next: (data) => {
        this.solicitudes = (data || []).map(p => ({
          ...p,
          apellidos: `${p.apellido1 ?? ''} ${p.apellido2 ?? ''}`.trim(),
        }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar las solicitudes';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  verPractica(solicitud: any) {
    this.router.navigate(['/vista-solicitud', solicitud.oferta_id]);
  }

  aprobar(solicitud: any) {
    if (!confirm(`¿Aprobar la práctica de ${solicitud.nombres} ${solicitud.apellido1}?`)) return;
    this.resolviendoId = solicitud.id;
    this.svc.resolver(solicitud.id, 'aceptada').subscribe({
      next: () => {
        this.mensaje = `✅ Práctica aprobada para ${solicitud.nombres}`;
        this.resolviendoId = null;
        this.cargar();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al aprobar';
        this.resolviendoId = null;
      },
    });
  }

  abrirModalRechazo(solicitud: any) {
    this.solicitudSeleccionada = solicitud;
    this.motivoRechazo = '';
    this.mostrarModalRechazo = true;
  }

  rechazar() {
    if (!this.solicitudSeleccionada) return;
    this.resolviendoId = this.solicitudSeleccionada.id;
    this.svc.resolver(this.solicitudSeleccionada.id, 'rechazada', this.motivoRechazo).subscribe({
      next: () => {
        this.mensaje = `❌ Solicitud rechazada`;
        this.resolviendoId = null;
        this.mostrarModalRechazo = false;
        this.cargar();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al rechazar';
        this.resolviendoId = null;
      },
    });
  }
}

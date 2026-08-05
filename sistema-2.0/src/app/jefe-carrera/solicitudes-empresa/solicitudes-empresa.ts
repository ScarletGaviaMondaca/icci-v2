import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfertasService } from '../../servicios/ofertas.service';

@Component({
  selector: 'app-solicitudes-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes-empresa.html',
  styleUrl: './solicitudes-empresa.css',
})
export class SolicitudesEmpresa implements OnInit {
  ofertas: any[] = [];
  cargando = false;
  error = '';
  mensaje = '';
  resolviendoId: number | null = null;

  mostrarDetalle = false;
  ofertaSeleccionada: any = null;
  practicaNumSeleccionada = 1;
  motivoRechazo = '';

  constructor(
    private svc: OfertasService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.svc.listarPendientesAprobacion().subscribe({
      next: (data) => {
        this.ofertas = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar las solicitudes de empresas';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  parsearConocimientos(texto: string): string[] {
    if (!texto) return [];
    return texto.split('\n').map(t => t.trim()).filter(t => t !== '');
  }

  verMas(oferta: any) {
    this.ofertaSeleccionada = oferta;
    this.practicaNumSeleccionada = oferta.practica_num ?? 1;
    this.motivoRechazo = '';
    this.mostrarDetalle = true;
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.ofertaSeleccionada = null;
  }

  aprobar() {
    if (!this.ofertaSeleccionada) return;
    if (!confirm(`¿Aprobar la oferta "${this.ofertaSeleccionada.titulo}" para práctica ${this.practicaNumSeleccionada}?`)) return;
    this.resolviendoId = this.ofertaSeleccionada.id;
    this.svc.aprobarOferta(this.ofertaSeleccionada.id, this.practicaNumSeleccionada).subscribe({
      next: () => {
        this.mensaje = `✅ Oferta aprobada para práctica ${this.practicaNumSeleccionada}`;
        this.resolviendoId = null;
        this.cerrarDetalle();
        this.cargar();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al aprobar la oferta';
        this.resolviendoId = null;
      },
    });
  }

  rechazar() {
    if (!this.ofertaSeleccionada) return;
    if (!confirm(`¿Rechazar la oferta "${this.ofertaSeleccionada.titulo}"?`)) return;
    this.resolviendoId = this.ofertaSeleccionada.id;
    this.svc.rechazarOferta(this.ofertaSeleccionada.id, this.motivoRechazo).subscribe({
      next: () => {
        this.mensaje = '❌ Oferta rechazada';
        this.resolviendoId = null;
        this.cerrarDetalle();
        this.cargar();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al rechazar la oferta';
        this.resolviendoId = null;
      },
    });
  }
}

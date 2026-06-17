import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';
import { OfertasService } from '../../servicios/ofertas.service';
import { NotificacionesService } from '../../servicios/notificaciones.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-noticias',
  imports: [CommonModule, FormsModule],
  templateUrl: './noticias.html',
  styleUrl: './noticias.css',
})
export class Noticias implements OnInit {
  ofertas: any[] = [];
  cargando = false;
  mensaje = '';
  error = '';
  postulando: number | null = null;
  esCandidato = false;
  practicaNumAlumno = 1;
  mostrarModalPostular = false;
  ofertaSeleccionada: any = null;
  // para el jefe de carrera
  postulaciones: any[] = [];
  cargandoPostulaciones = false;
  resolviendoId: number | null = null;
  motivoRechazo = '';
  mostrarModalRechazo = false;
  postulacionSeleccionada: any = null;

  // para el profesor
  notifProfesor: any[] = [];
  cargandoNotifProfesor = false;
  mostrarModalRevision = false;
  notifSeleccionada: any = null;

  constructor(
    public auth: AuthService,
    private svc: OfertasService,
    private notifSvc: NotificacionesService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.auth.esAlumno()) {
      this.verificarSiEsCandidato();
    }
    if (this.auth.esJefeCarrera() || this.auth.esAdmin()) {
      this.cargarPostulaciones();
    }
    if (this.auth.esProfesor()) {
      this.cargarNotifProfesor();
    }
  }
  // para el alumno
  verificarSiEsCandidato() {
    const alumnoId = this.auth.getUsuario()?.alumno_id;
    if (!alumnoId) return;
    this.svc.verificarCandidato(alumnoId).subscribe({
      next: (res) => {
        this.esCandidato = res.es_candidato;
        this.practicaNumAlumno = res.practica_num?? 1;
        if (this.esCandidato) this.cargarOfertas();
        this.cdr.detectChanges();
      },
      error: () => this.esCandidato = false
    });
  }
  cargarOfertas() {
    this.cargando = true;
    const alumnoId = this.auth.getUsuario()?.alumno_id ?? 0;
    this.svc.listarOfertas(alumnoId).subscribe({
      next: (data) => {
        this.ofertas = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar ofertas';
        this.cargando = false;
      }
    });
  }
  postular(oferta: any) {
    if (!confirm(`¿Postular a "${oferta.titulo}" en ${oferta.empresa_nombre}?`)) return;
    this.postulando = oferta.id;
    this.svc.postular(oferta.id, this.auth.getUsuario()?.alumno_id).subscribe({
      next: () => {
        this.mensaje = '✅ Postulación enviada correctamente';
        this.postulando = null;
        this.cargarOfertas();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al postular';
        this.postulando = null;
        setTimeout(() => this.error = '', 3000);
      }
    });
  }
  parsearConocimientos(texto: string): string[] {
    if (!texto) return [];
    return texto.split('\n').map(t => t.trim()).filter(t => t !== '');
  }
  abrirModalPostular(oferta: any) {
    this.ofertaSeleccionada = oferta;
    this.mostrarModalPostular = true;
  }

  confirmarPostulacion() {
    if (!this.ofertaSeleccionada) return;
    this.postulando = this.ofertaSeleccionada.id;
    this.svc.postular(
      this.ofertaSeleccionada.id,
      this.auth.getUsuario()?.alumno_id,
      this.practicaNumAlumno
    ).subscribe({
      next: () => {
        this.mensaje = '✅ Postulación enviada correctamente';
        this.postulando = null;
        this.mostrarModalPostular = false;
        this.cargarOfertas();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al postular';
        this.postulando = null;
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  // para el jefe de carrera
  cargarPostulaciones() {
    this.cargandoPostulaciones = true;
    this.svc.listarTodasPostulaciones().subscribe({
      next: (data) => {
        this.postulaciones = data;
        this.cargandoPostulaciones = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoPostulaciones = false;
      }
    });
  }
  aceptar(postulacion: any) {
    if (!confirm(`¿Aceptar la postulación de ${postulacion.nombres} ${postulacion.apellido1}?`)) return;
    this.resolviendoId = postulacion.id;
    this.svc.resolver(postulacion.id, 'aceptada').subscribe({
      next: () => {
        this.mensaje = `✅ Práctica aceptada para ${postulacion.nombres}`;
        this.resolviendoId = null;
        this.cargarPostulaciones();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al aceptar';
        this.resolviendoId = null;
      }
    });
  }
  abrirModalRechazo(postulacion: any) {
    this.postulacionSeleccionada = postulacion;
    this.motivoRechazo = '';
    this.mostrarModalRechazo = true;
  }
  rechazar() {
    if (!this.postulacionSeleccionada) return;
    this.resolviendoId = this.postulacionSeleccionada.id;
    this.svc.resolver(this.postulacionSeleccionada.id, 'rechazada', this.motivoRechazo).subscribe({
      next: () => {
        this.mensaje = `❌ Postulación rechazada`;
        this.resolviendoId = null;
        this.mostrarModalRechazo = false;
        this.cargarPostulaciones();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => {
        this.error = '❌ Error al rechazar';
        this.resolviendoId = null;
      }
    });
  }

  // ── Profesor ──────────────────────────────────────────────────────

  cargarNotifProfesor() {
    const usuarioId = this.auth.getUsuario()?.id;
    if (!usuarioId) return;
    this.cargandoNotifProfesor = true;
    this.notifSvc.listarProfesor(usuarioId).subscribe({
      next: (data) => {
        this.notifProfesor = data;
        this.cargandoNotifProfesor = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoNotifProfesor = false; }
    });
  }

  abrirModalRevision(notif: any) {
    this.notifSeleccionada = notif;
    this.mostrarModalRevision = true;
    if (!notif.leida) {
      this.notifSvc.marcarLeidaProfesor(notif.id).subscribe(() => {
        notif.leida = 1;
        this.cdr.detectChanges();
      });
    }
  }

  marcarTodasLeidasProfesor() {
    const usuarioId = this.auth.getUsuario()?.id;
    if (!usuarioId) return;
    this.notifSvc.marcarTodasLeidasProfesor(usuarioId).subscribe(() => {
      this.notifProfesor.forEach(n => n.leida = 1);
      this.cdr.detectChanges();
    });
  }

  abrirEvaluacion() {
    if (!this.notifSeleccionada?.seguimiento_id) return;
    this.mostrarModalRevision = false;
    this.router.navigate(['/evaluar-informe', this.notifSeleccionada.seguimiento_id]);
  }
}
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';
import { OfertasService } from '../../servicios/ofertas.service';
import { NotificacionesService } from '../../servicios/notificaciones.service';

@Component({
  selector: 'app-noticias',
  imports: [CommonModule],
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

  parsearConocimientos(texto: string): string[] {
    if (!texto) return [];
    return texto.split('\n').map(t => t.trim()).filter(t => t !== '');
  }
  masInformacion(oferta: any) {
    this.router.navigate([`/vista-solicitud/${oferta.id}`]);
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
import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth.service';
import { NotificacionesService } from '../../servicios/notificaciones.service';
import { NotificacionesAlumnoService } from '../../servicios/notificaciones-alumno.service';
import { SeguimientoService } from '../../servicios/seguimiento.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule], 
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  menuAbierto = false;
  subMenu: any[] = [];
  notificaciones: any[] = [];
  noLeidas = 0;
  mostrarNotificaciones = false;
  dropdownAbierto = false;

  //para las notificaciones del alumno
  notifAlumno: any[] = [];
  noLeidasAlumno = 0;
  mostrarNotifAlumno = false;

  // para el empleador
  evaluacionesEmpleador: any[] = [];
  mostrarEvalEmpleador = false;
  get evalPendientes(): number {
    return this.evaluacionesEmpleador.filter(e => e.eval_empresa_estado === 1).length;
  }

  constructor(
    private router: Router,
    public auth: AuthService,
    private notifSvc: NotificacionesService,
    public notifAlumnoSvc: NotificacionesAlumnoService,
    private segSvc: SeguimientoService,
    private cdr: ChangeDetectorRef
  ) {
    this.actualizarSubMenu(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.actualizarSubMenu(event.urlAfterRedirects);
        // Refresca contador al navegar
        if (this.auth.esSecretaria() || this.auth.esJefeCarreraEfectivo() || this.auth.esDirectorDepartamentoEfectivo() || this.auth.esSecretariaDici()) {
          this.cargarNoLeidas();
        }
      }
    });
    // Carga inicial
    if (this.auth.esSecretaria() || this.auth.esJefeCarreraEfectivo() || this.auth.esDirectorDepartamentoEfectivo() || this.auth.esSecretariaDici()) {
      this.cargarNoLeidas();
      setInterval(() => this.cargarNoLeidas(), 5 * 60 * 1000);
    }
    if (this.auth.esAlumno()) {
      this.cargarNoLeidasAlumno();
      setInterval(() => this.cargarNoLeidasAlumno(), 5 * 60 * 1000);
    }
    if (this.auth.esEmpleador()) {
      this.cargarEvaluacionesEmpleador();
      setInterval(() => this.cargarEvaluacionesEmpleador(), 5 * 60 * 1000);
    }
    document.addEventListener('click', (e: any) => {
      if (!e.target.closest('.dropdown')) {
        this.dropdownAbierto = false;
      }
      if (!e.target.closest('.notif-wrapper')) {
        this.mostrarNotificaciones = false;
        this.mostrarNotifAlumno = false;
        this.mostrarEvalEmpleador = false;
      }
      this.cdr.detectChanges();
    });
  }
  
  toggleDropdown() {
    this.dropdownAbierto = !this.dropdownAbierto;
  }
  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }
  actualizarSubMenu(url: string) {
    if (url.startsWith('/jefe')) {
      // Solo admin y secretaria ven el menú de jefe
      if (!this.auth.esAdmin() && !this.auth.esSecretaria()) {
        this.subMenu = [];
        return;
      }
      this.subMenu = [
        { nombre: 'Alumnos', ruta: '/jefe/listado-alumnos' },
        { nombre: 'Carrera', ruta: '/jefe/carrera' },
       // { nombre: 'Empleadores', ruta: '/jefe/empleadores' }
      ];
    }
    else if (url.startsWith('/organizacion')) {
      this.subMenu = [
        { nombre: 'Organigrama', ruta: '/organizacion/organigrama' },
        { nombre: 'Académicos', ruta: '/organizacion/academicos' }
      ];

    }
    else if (url.startsWith('/carrera')) {
      this.subMenu = [
        { nombre: 'Información', ruta: '/carrera/informacion' },
        { nombre: 'Reglamentos', ruta: '/carrera/reglamentos' },
      ];
    }
    else if (url.startsWith('/alumno')) {
      // Solo alumno ve su submenú
      if (!this.auth.esAlumno() && !this.auth.esAdmin()) {
        this.subMenu = [];
        return;
      }
      this.subMenu = [
        { nombre: 'Mapas UTA', ruta: '/alumno/mapa' },
      //  { nombre: 'Procesos comunes', ruta: '/alumno/procesos' },
      ];
    }
    else if (url.startsWith('/seguimiento')) {
      // Solo admin y secretaria
      if (!this.auth.esAdmin() && !this.auth.esSecretaria()) {
        this.subMenu = [];
        return;
      }
      this.subMenu = [
        { nombre: 'Práctica 1', ruta: '/seguimiento/practica/1' },
        { nombre: 'Práctica 2', ruta: '/seguimiento/practica/2' }
      ];
    }
    else if (url.startsWith('/acreditacion')) {
      // Solo admin y secretaria
      if (!this.auth.esAdmin() && !this.auth.esSecretaria()) {
        this.subMenu = [];
        return;
      }
      this.subMenu = [
        { nombre: 'Informes', ruta: '/acreditacion/alumnos' },
        { nombre: 'Empresas', ruta: '/acreditacion/empresas' }
      ]
    }
    else if (url.startsWith('/practicas')) {
      // Solo jefe de carrera y secretaria ven el menú de practicas
      if (!this.auth.esJefeCarreraEfectivo() && !this.auth.esSecretaria()) {
        this.subMenu = [];
        return;
      }
      this.subMenu = [
        ...(this.auth.esJefeCarreraEfectivo() ? [{ nombre: 'Solicitudes', ruta: '/practicas/solicitudes' }] : []),
        { nombre: 'Practicantes', ruta: '/practicas/practicantes' },
        { nombre: 'Evaluacion informes', ruta: '/practicas/evaluacion-informes' },
        { nombre: 'Informes atrasados', ruta: '/practicas/informes-atrasados' }
      ];
    }
    else {
      this.subMenu = [];
    }
  }
  cargarNoLeidas() {
    this.notifSvc.noLeidas().subscribe({
      next: (res) => this.noLeidas = res.total
    });
  }

  abrirNotificaciones() {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones) {
      this.notifSvc.listar().subscribe({
        next: (data) =>{
          this.notificaciones = data;
          this.cdr.detectChanges(); // Asegura que se actualice la vista con las notificaciones cargadas
        }
      });
    }
  }

  irASeguimiento(notif: any) {
    this.notifSvc.marcarLeida(notif.id).subscribe({
      next: () => {
        notif.leida = 1;
        this.noLeidas = Math.max(0, this.noLeidas - 1);
        if (notif.hito === 'postulacion_pendiente') {
          this.router.navigate(['/evaluar']);
        } else if (notif.hito === 'informe_atrasado') {
          this.router.navigate(['/practicas/informes-atrasados']);
        } else if (notif.hito === 'profesor_evaluador_propuesto') {
          this.router.navigate(['/profesor-evaluador']);
        } else if (this.auth.esDirectorDepartamentoEfectivo()) {
          this.router.navigate(['/profesor-evaluador']);
        } else {
          this.router.navigate(['/seguimiento/avance', notif.alumno_id, notif.practica_num]);
        }
        this.mostrarNotificaciones = false;
      }
    });
  }
  //para las notificaciones del alumno
  cargarNoLeidasAlumno() {
    this.notifAlumnoSvc.noLeidas().subscribe({
      next: (res) => {
        this.noLeidasAlumno = res.total;
        this.cdr.detectChanges();
      }
    });
  }

  abrirNotifAlumno() {
    this.mostrarNotifAlumno = !this.mostrarNotifAlumno;
    if (this.mostrarNotifAlumno) {
      this.notifAlumnoSvc.listar().subscribe({
        next: (data) => {
          this.notifAlumno = data;
          this.cdr.detectChanges();
        }
      });
    }
  }

  marcarTodasLeidasAlumno() {
    this.notifAlumnoSvc.marcarTodasLeidas().subscribe({
      next: () => {
        this.notifAlumno.forEach(n => n.leida = 1);
        this.noLeidasAlumno = 0;
        this.cdr.detectChanges();
      }
    });
  }

  marcarTodasLeidas() {
    this.notifSvc.marcarTodasLeidas().subscribe({
      next: () => {
        this.notificaciones.forEach(n => n.leida = 1);
        this.noLeidas = 0;
      }
    });
  }

  // ── Empleador: evaluaciones ───────────────────────────────────────
  cargarEvaluacionesEmpleador() {
    const usuarioId = this.auth.getUsuario()?.id;
    if (!usuarioId) return;
    this.segSvc.getEvaluacionesEmpleador(usuarioId).subscribe({
      next: (data) => { this.evaluacionesEmpleador = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  abrirEvalEmpleador() {
    this.mostrarEvalEmpleador = !this.mostrarEvalEmpleador;
    if (this.mostrarEvalEmpleador) this.cargarEvaluacionesEmpleador();
  }

  irEvaluarDesdeHeader(item: any) {
    this.mostrarEvalEmpleador = false;
    this.router.navigate(['/evaluar-empresa'], { state: { notif: item } });
  }

  estadoEvalLabel(estado: number): string {
    if (estado === 1) return 'Pendiente';
    if (estado === 2) return 'Evaluada';
    return 'Sin evaluación aún';
  }

  estadoEvalClass(estado: number): string {
    if (estado === 1) return 'badge bg-warning text-dark';
    if (estado === 2) return 'badge bg-success';
    return 'badge bg-secondary';
  }

  logout() {
    this.auth.logout();
  }
}

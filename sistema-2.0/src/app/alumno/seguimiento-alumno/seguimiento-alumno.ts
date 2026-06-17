import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-seguimiento-alumno',
  imports: [CommonModule],
  templateUrl: './seguimiento-alumno.html',
  styleUrl: './seguimiento-alumno.css'
})
export class SeguimientoAlumno implements OnInit {
  practica1: any = null;
  practica2: any = null;
  obs1: any[] = [];
  obs2: any[] = [];
  tabActiva: 1 | 2 = 1;
  cargando = true;
  error: string | null = null;

  subiendoInforme = false;
  mensajeInforme = '';
  errorInforme = '';
  informeArchivo: File | null = null;

  archivosCorregidos: { [obsId: number]: File | null } = {};
  subiendoCorregido: { [obsId: number]: boolean } = {};
  mensajesCorregido: { [obsId: number]: string } = {};
  erroresCorregido: { [obsId: number]: string } = {};

  hitos = [
    { key: 'practica1_estado',      label: 'Estudiante en Práctica',   fechaInicio: 'practica1_fecha_inicio',      fechaTermino: 'practica1_fecha_termino' },
    { key: 'informe_elab_estado',   label: 'Elaboración del Informe',  fechaInicio: 'informe_elab_fecha_inicio',   fechaTermino: 'informe_elab_fecha_termino' },
    { key: 'informe_rev_estado',    label: 'Revisión del Informe',     fechaInicio: 'informe_rev_fecha_inicio',    fechaTermino: 'informe_rev_fecha_termino' },
    { key: 'eval_empresa_estado',   label: 'Evaluación Empresa',       fechaInicio: 'eval_empresa_fecha_inicio',   fechaTermino: 'eval_empresa_fecha_termino' },
    { key: 'comite_carrera_estado', label: 'Comité de Carrera',        fechaInicio: 'comite_carrera_fecha_inicio', fechaTermino: 'comite_carrera_fecha_termino' },
    { key: 'envioreg_estado',       label: 'Envío a Registraduría',    fechaInicio: 'envioreg_fecha_inicio',       fechaTermino: 'envioreg_fecha_termino' },
  ];

  estados = [
    { value: 0, label: 'No iniciado',  badge: 'bg-secondary' },
    { value: 1, label: 'Pendiente',    badge: 'bg-warning text-dark' },
    { value: 2, label: 'Aprobado',     badge: 'bg-success' },
    { value: 3, label: 'Reprobado',    badge: 'bg-danger' },
  ];

  constructor(
    private seg: SeguimientoService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const alumno_id = this.auth.getUsuario()?.alumno_id;
    if (!alumno_id) {
      this.error = 'No se encontró tu información de alumno.';
      this.cargando = false;
      return;
    }

    forkJoin({
      p1: this.seg.getMiSeguimiento(alumno_id, 1),
      p2: this.seg.getMiSeguimiento(alumno_id, 2),
    }).subscribe({
      next: ({ p1, p2 }) => {
        const seg1 = Array.isArray(p1) ? p1[0] : p1;
        const seg2 = Array.isArray(p2) ? p2[0] : p2;

        this.practica1 = seg1?.seguimiento_id ? seg1 : null;
        this.practica2 = seg2?.seguimiento_id ? seg2 : null;

        // Activar la tab de la práctica en curso
        if (!this.practica1 && this.practica2) this.tabActiva = 2;

        if (!this.practica1 && !this.practica2) {
          this.error = 'No tienes un seguimiento de práctica activo.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        const loads: any[] = [];
        if (this.practica1) loads.push(this.seg.getFechasObservacion(this.practica1.seguimiento_id));
        if (this.practica2) loads.push(this.seg.getFechasObservacion(this.practica2.seguimiento_id));

        forkJoin(loads).subscribe((results: any[]) => {
          if (this.practica1) this.obs1 = results[0] ?? [];
          if (this.practica2) this.obs2 = (this.practica1 ? results[1] : results[0]) ?? [];
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.error = 'No tienes un seguimiento de práctica activo.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get seguimientoActivo() { return this.tabActiva === 1 ? this.practica1 : this.practica2; }
  get observacionesActivas() { return this.tabActiva === 1 ? this.obs1 : this.obs2; }

  getEstado(value: number) {
    return this.estados.find(e => e.value == value) ?? this.estados[0];
  }

  getObservacionesHito(hito: string) {
    return this.observacionesActivas.filter((o: any) => o.hito === hito);
  }

  onArchivoInforme(event: Event) {
    const input = event.target as HTMLInputElement;
    this.informeArchivo = input.files?.[0] ?? null;
  }

  onArchivoCorregido(obsId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivosCorregidos[obsId] = input.files?.[0] ?? null;
  }

  subirInformeCorregido(obs: any) {
    const seg = this.seguimientoActivo;
    const archivo = this.archivosCorregidos[obs.id];
    if (!archivo || !seg) return;
    this.subiendoCorregido[obs.id] = true;
    this.erroresCorregido[obs.id] = '';
    this.mensajesCorregido[obs.id] = '';
    const fd = new FormData();
    fd.append('informe', archivo);
    fd.append('seguimiento_id', String(seg.seguimiento_id));
    fd.append('alumno_id', String(seg.alumno_id ?? this.auth.getUsuario()?.alumno_id));
    fd.append('practica_num', String(seg.practica_num));
    fd.append('obs_id', String(obs.id));
    this.seg.subirInforme(fd).subscribe({
      next: () => {
        this.mensajesCorregido[obs.id] = '✅ Informe corregido entregado';
        this.subiendoCorregido[obs.id] = false;
        this.archivosCorregidos[obs.id] = null;
        this.ngOnInit();
      },
      error: () => {
        this.erroresCorregido[obs.id] = '❌ Error al subir el informe';
        this.subiendoCorregido[obs.id] = false;
        this.cdr.detectChanges();
      }
    });
  }

  subirInforme() {
    const seg = this.seguimientoActivo;
    if (!this.informeArchivo || !seg) return;
    this.subiendoInforme = true;
    this.errorInforme = '';
    this.mensajeInforme = '';
    const fd = new FormData();
    fd.append('informe', this.informeArchivo);
    fd.append('seguimiento_id', String(seg.seguimiento_id));
    fd.append('alumno_id', String(seg.alumno_id ?? this.auth.getUsuario()?.alumno_id));
    fd.append('practica_num', String(seg.practica_num));
    this.seg.subirInforme(fd).subscribe({
      next: () => {
        this.mensajeInforme = '✅ Informe subido correctamente';
        this.subiendoInforme = false;
        this.informeArchivo = null;
        this.ngOnInit();
      },
      error: () => {
        this.errorInforme = '❌ Error al subir el informe';
        this.subiendoInforme = false;
      }
    });
  }
}

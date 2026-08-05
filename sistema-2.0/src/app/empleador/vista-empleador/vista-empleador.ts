import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';
import { OfertasService } from '../../servicios/ofertas.service';

@Component({
  selector: 'app-vista-empleador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vista-empleador.html',
  styleUrl: './vista-empleador.css'
})
export class VistaEmpleador implements OnInit {
  ofertas: any[] = [];
  cargando = false;
  mensaje = '';
  error = '';
  mostrarFormOferta = false;
  ofertaEditando: any = null;

  form = {
    titulo: '', descripcion: '', conocimientos: '', tareas: '',
    modalidad: 'Presencial', horas_semanales: 0, fecha_inicio: '', nombre_supervisor: '', turno: '4x3',
  };

  formEditar = {
    titulo: '', descripcion: '', conocimientos: '', tareas: '',
    modalidad: 'Presencial', horas_semanales: 0, fecha_inicio: '', nombre_supervisor: '', turno: '4x3',
  };

  constructor(
    public auth: AuthService,
    private svc: OfertasService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarOfertas();
  }

  get empleadorId(): number {
    return this.auth.getUsuario()?.empleador_id ?? 0;
  }

  cargarOfertas() {
    this.cargando = true;
    this.svc.misOfertas(this.empleadorId).subscribe({
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

  crearOferta() {
    if (!this.form.titulo || !this.form.nombre_supervisor) {
      this.error = '🚫 Completa los campos requeridos';
      return;
    }
    this.svc.crearOferta({ ...this.form, empleador_id: this.empleadorId }).subscribe({
      next: () => {
        this.mensaje = '✅ Oferta publicada correctamente';
        this.mostrarFormOferta = false;
        this.form = {
          titulo: '', descripcion: '', conocimientos: '', tareas: '',
          modalidad: 'Presencial', horas_semanales: 0,
          fecha_inicio: '', nombre_supervisor: '', turno: '4x3'
        };
        this.cargarOfertas();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al crear oferta';
      }
    });
  }

  editarOferta(o: any) {
    this.ofertaEditando = o;
    this.formEditar = {
      titulo:            o.titulo            ?? '',
      descripcion:       o.descripcion       ?? '',
      conocimientos:     o.conocimientos     ?? '',
      tareas:            o.tareas            ?? '',
      modalidad:         o.modalidad         ?? 'Presencial',
      horas_semanales:   o.horas_semanales   ?? 0,
      fecha_inicio:      o.fecha_inicio ? String(o.fecha_inicio).substring(0, 10) : '',
      nombre_supervisor: o.nombre_supervisor ?? '',
      turno:             o.turno ?? '4x3',
    };
    this.mostrarFormOferta = false;
  }

  cancelarEdicion() {
    this.ofertaEditando = null;
  }

  guardarEdicion() {
    this.svc.actualizarOferta(this.ofertaEditando.id, { ...this.formEditar }).subscribe({
      next: () => {
        this.mensaje = '✅ Oferta actualizada correctamente';
        this.ofertaEditando = null;
        this.cargarOfertas();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al actualizar oferta';
      }
    });
  }

  desactivarOferta(id: number) {
    if (!confirm('¿Desactivar esta oferta?')) return;
    this.svc.desactivarOferta(id).subscribe({
      next: () => {
        this.mensaje = '✅ Oferta desactivada';
        this.cargarOfertas();
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: () => this.error = '❌ Error al desactivar'
    });
  }

  verPostulaciones(oferta: any) {
    this.router.navigate(['/vista-solicitud', oferta.id]);
  }
}
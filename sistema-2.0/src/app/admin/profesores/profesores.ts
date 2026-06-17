import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfesoresService } from '../../servicios/profesores.service';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profesores.html',
  styleUrls: ['./profesores.css']
})
export class Profesores implements OnInit {
  profesores: any[] = [];
  mensaje: string | null = null;
  error: string | null = null;
  mostrarForm = false;
  creando = false;
  nuevo = { nombre: '', apellido1: '', apellido2: '', correo: '', tipo: '', activo: 1, foto: null };
  mostrarEditar = false;
  editando = false;
  editForm = { id: 0, nombre: '', apellido1: '', apellido2: '', correo: '', tipo: '', activo: 1, foto: '' };
  fotoSeleccionada: File | null = null;
  tipos: string[]  = [];
  nuevoTipo        = '';
  mostrarNuevoTipo = false;


  constructor(
    private svc: ProfesoresService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { 
    this.cargar(); 
    this.cargarTipos();
  }

  cargar() {
    this.svc.listar().subscribe({
      next: (p) => { this.profesores = p; this.cdr.detectChanges(); },
      error: () => this.mostrarError('Error al cargar profesores')
    });
  }

  crear() {
    if (!this.nuevo.nombre || !this.nuevo.apellido1 ) {
      this.mostrarError('Nombre, apellido paterno y correo son requeridos');
      return;
    }
    this.creando = true;
    this.svc.crear(this.nuevo).subscribe({
      next: (resp) => {
        // Subir foto si hay y si el backend responde con id
        if (resp.id && this.fotoSeleccionada) {
          const fd = new FormData();
          fd.append('foto', this.fotoSeleccionada);
          fd.append('id', resp.id);
          this.svc.subirFoto(resp.id, this.fotoSeleccionada).subscribe({
            next: () => {
              this.finalizarCreacion();
            },
            error: () => {
              this.mostrarError('Error al subir la foto');
              this.creando = false;
            }
          });
        } else {
          this.finalizarCreacion();
        }
      },
      error: (err) => {
        this.mostrarError(err.error?.error ?? '❌ Error al crear');
        this.creando = false;
      }
    });
  }
  cargarTipos() {
    this.svc.listarTipos().subscribe({
      next: t => { this.tipos = t; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  finalizarCreacion() {
    this.mostrarMensaje('✅ Profesor creado');
    this.nuevo = { nombre: '', apellido1: '', apellido2: '', correo: '',tipo:'', activo: 1, foto: null };
    this.mostrarForm = false;
    this.creando = false;
    this.fotoSeleccionada = null;
    this.cargar();
  }

  toggleFormulario() {
    this.mostrarForm = !this.mostrarForm;
  }

  toggleActivo(p: any) {
    this.svc.toggleActivo(p.id).subscribe({
      next: () => { p.activo = p.activo == 1 ? 0 : 1; this.cdr.detectChanges(); },
      error: () => this.mostrarError('Error al actualizar')
    });
  }

  eliminar(p: any) {
    if (!confirm(`¿Eliminar a ${p.nombre} ${p.apellido1}?`)) return;
    this.svc.eliminar(p.id).subscribe({
      next: () => { this.mostrarMensaje('✅ Profesor eliminado'); this.cargar(); },
      error: () => this.mostrarError('Error al eliminar')
    });
  }

  mostrarMensaje(msg: string) {
    this.mensaje = msg; this.error = null;
    setTimeout(() => this.mensaje = null, 3000);
  }
  mostrarError(msg: string) {
    this.error = msg; this.mensaje = null;
    setTimeout(() => this.error = null, 3000);
  }
//Modal para editar profesor
  abrirEditar(p: any) {
    this.editForm = { id: p.id, nombre: p.nombre, apellido1: p.apellido1, apellido2: p.apellido2 ?? '', correo: p.correo ?? '', tipo: p.tipo ?? '', activo: p.activo, foto: p.foto ?? '' };
    this.mostrarEditar = true;
    this.cdr.detectChanges();
  }

  cerrarEditar() {
    this.mostrarEditar = false;
  }
  onFotoSeleccionada(event: any) {
    const file = event.target.files[0];
    this.fotoSeleccionada = file;
  }

  guardarEdicion() {
    if (!this.editForm.nombre || !this.editForm.apellido1) {
      this.mostrarError('Nombre y apellido paterno son requeridos');
      return;
    }
    this.editando = true;
    this.svc.editar(this.editForm).subscribe({
      next: () => {
        // Si hay foto seleccionada, subirla
        if (this.fotoSeleccionada) {
          this.svc.subirFoto(this.editForm.id, this.fotoSeleccionada).subscribe({
            next: (res) => {
              this.fotoSeleccionada = null;
              this.editando = false;
              this.cerrarEditar();
              this.cargar();
              this.mostrarMensaje('✅ Profesor actualizado con foto');
            },
            error: () => {
              this.mostrarError('Datos guardados pero error al subir foto');
              this.editando = false;
              this.cerrarEditar();
              this.cargar();
            }
          });
        } else {
          this.editando = false;
          this.cerrarEditar();
          this.cargar();
          this.mostrarMensaje('✅ Profesor actualizado');
        }
      },
      error: (err) => {
        this.mostrarError(err.error?.error ?? '❌ Error al editar');
        this.editando = false;
      }
    });
  }
  
  agregarNuevoTipo(destino: 'nuevo' | 'editar') {
    const t = this.nuevoTipo.trim();
    if (!t) return;
    if (!this.tipos.includes(t)) this.tipos.push(t);
    if (destino === 'nuevo') this.nuevo.tipo = t;
    else                     this.editForm.tipo = t;
    this.nuevoTipo        = '';
    this.mostrarNuevoTipo = false;
    this.cdr.detectChanges();
  }
  
}
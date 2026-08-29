import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../servicios/usuarios.service';

@Component({
  selector: 'app-config-correo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-correo.html',
  styleUrl: './config-correo.css',
})
export class ConfigCorreo implements OnInit {
  config: { correo: string | null; configurado: boolean } | null = null;
  correoRemitente = '';
  appPassword = '';
  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';

  constructor(
    private svc: UsuariosService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.svc.getConfigCorreo().subscribe({
      next: (data) => {
        this.config = data;
        this.correoRemitente = data.correo ?? '';
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar la configuración de correo';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardar() {
    if (!this.correoRemitente.trim()) {
      this.mostrarError('El correo remitente es requerido');
      return;
    }
    this.guardando = true;
    this.svc.actualizarConfigCorreo(this.correoRemitente.trim(), this.appPassword.trim() || undefined).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Correo remitente actualizado');
        this.appPassword = '';
        this.guardando = false;
        this.cargar();
      },
      error: (err) => {
        this.mostrarError(err.error?.error ?? '❌ Error al guardar el correo remitente');
        this.guardando = false;
      },
    });
  }

  mostrarMensaje(msg: string) {
    this.mensaje = msg;
    this.error = '';
    setTimeout(() => this.mensaje = '', 4000);
  }

  mostrarError(msg: string) {
    this.error = msg;
    this.mensaje = '';
    setTimeout(() => this.error = '', 4000);
  }
}

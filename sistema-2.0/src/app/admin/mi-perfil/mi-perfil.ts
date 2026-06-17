import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../servicios/usuarios.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-mi-perfil',
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css'
})
export class MiPerfil implements OnInit {
  perfil: any = null;
  editando = false;
  mensaje: string | null = null;
  error: string | null = null;

  // Cambiar contraseña
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  mostrarCambioPass = false;
  verActual = false;
  verNueva = false;
  verConfirmar = false;

  constructor(
    private svc: UsuariosService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.svc.getMiPerfil().subscribe({
      next: (data) => {
        this.perfil = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('Error al cargar perfil');
        this.cdr.detectChanges();
      }
    });
  }

  guardar() {
    const payload: any = {
      nombre:    this.perfil.nombre,
      apellido1: this.perfil.apellido1,
      apellido2: this.perfil.apellido2,
      correo:    this.perfil.correo,
    };
    if (this.perfil.perfil_profesor) {
      payload.perfil_profesor = { ...this.perfil.perfil_profesor };
    }
    if (this.perfil.perfil_empleador) {
      payload.perfil_empleador = { ...this.perfil.perfil_empleador };
    }
    this.svc.actualizarPerfil(payload).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Perfil actualizado');
        this.editando = false;
        this.cdr.detectChanges();
      },
      error: (err) => this.mostrarError(err.error?.error ?? '❌ Error al guardar')
    });
  }

  cambiarPassword() {
    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.mostrarError('Completa todos los campos');
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.mostrarError('Las contraseñas nuevas no coinciden');
      return;
    }
      const errorValidacion = this.validarPassword(this.passwordNueva);
    if (errorValidacion) {
      this.mostrarError(errorValidacion);
      return;
    }
    if (this.passwordNueva.length < 6) {
      this.mostrarError('Mínimo 6 caracteres');
      return;
    }
    
    this.svc.cambiarMiPassword(this.passwordActual, this.passwordNueva).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Contraseña actualizada');
        this.passwordActual = '';
        this.passwordNueva = '';
        this.passwordConfirmar = '';
        this.mostrarCambioPass = false;
        this.cdr.detectChanges();
      },
      error: (err) => this.mostrarError(err.error?.error ?? '❌ Error al cambiar contraseña')
    });
  }

  mostrarMensaje(msg: string) {
    this.mensaje = msg;
    this.error = null;
    setTimeout(() => this.mensaje = null, 3000);
  }

  mostrarError(msg: string) {
    this.error = msg;
    this.mensaje = null;
    setTimeout(() => this.error = null, 3000);
  }
  validarPassword(password: string): string | null {
    if (password.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Debe tener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'Debe tener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'Debe tener al menos un número';
    return null;
  }
}
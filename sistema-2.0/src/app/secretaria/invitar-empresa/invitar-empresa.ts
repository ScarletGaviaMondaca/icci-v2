import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../servicios/usuarios.service';

@Component({
  selector: 'app-invitar-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitar-empresa.html',
  styleUrl: './invitar-empresa.css',
})
export class InvitarEmpresa {
  correoToken = '';
  tokenGenerado = '';
  generandoToken = false;
  mensaje = '';
  error = '';

  constructor(private svc: UsuariosService) {}

  generarTokenEmpleador() {
    if (!this.correoToken.trim()) {
      this.mostrarError('Ingresa un correo');
      return;
    }
    this.generandoToken = true;
    this.svc.generarTokenEmpleador(this.correoToken).subscribe({
      next: (res) => {
        this.tokenGenerado = `http://localhost:4200/registro-empleador?token=${res.token}`;
        this.generandoToken = false;
        this.mostrarMensaje(`✅ Correo enviado a ${this.correoToken}`);
      },
      error: () => {
        this.mostrarError('❌ Error al enviar la invitación');
        this.generandoToken = false;
      },
    });
  }

  copiarToken() {
    navigator.clipboard.writeText(this.tokenGenerado);
    this.mostrarMensaje('✅ Link copiado al portapapeles');
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

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  error: string | null = null;
  cargando = false;

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    if (!this.username || !this.password) {
      this.error = 'Ingresa usuario y contraseña.';
      return;
    }
    this.cargando = true;
    this.error = null;

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.cargando = false;
        // Ahora NestJS devuelve res.rol directamente
        switch (res.rol) {
          case 'admin':
          case 'secretaria':
            this.router.navigate(['/noticias']);
            break;
          case 'alumno':
            this.router.navigate(['/noticias']);
            break;
          default:
            this.router.navigate(['/noticias']);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error ?? 'Error al iniciar sesión.';
      }
    });
  }
}
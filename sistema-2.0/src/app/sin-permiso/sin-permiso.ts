import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';

@Component({
  selector: 'app-sin-permiso',
  imports: [],
  templateUrl: './sin-permiso.html',
})
export class SinPermiso {
  constructor(private router: Router, private auth: AuthService) {}

  volver() {
    switch (this.auth.getRol()) {
      case 'admin':
      case 'secretaria':
        this.router.navigate(['/noticias']);
        break;
      case 'alumno':
        this.router.navigate(['/alumno/mapa']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }
}

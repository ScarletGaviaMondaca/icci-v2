import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificacionesAlumnoService {
  private apiUrl = 'http://localhost:3000/notificaciones';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private get alumnoId(): number {
    return this.auth.getUsuario()?.alumno_id;
  }

  listar() {
    return this.http.get<any[]>(
      `${this.apiUrl}/alumno/${this.alumnoId}`,
      this.auth.getHeaders()
    );
  }

  noLeidas() {
    return this.http.get<any>(
      `${this.apiUrl}/alumno/${this.alumnoId}/count`,
      this.auth.getHeaders()
    );
  }

  marcarLeida(id: number) {
    return this.http.put<any>(
      `${this.apiUrl}/${id}/leer`,
      {},
      this.auth.getHeaders()
    );
  }

  marcarTodasLeidas() {
    return this.http.put<any>(
      `${this.apiUrl}/alumno/${this.alumnoId}/leer-todas`,
      {},
      this.auth.getHeaders()
    );
  }
}

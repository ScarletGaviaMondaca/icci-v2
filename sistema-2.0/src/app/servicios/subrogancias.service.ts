import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SubrogantesService {
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  getActiva(rolSuplido: string) {
    return this.http.get<any>(
      `${this.apiUrl}/subrogancias/activa?rol=${rolSuplido}`,
      this.auth.getHeaders()
    );
  }

  activar(profesorId: number, rolSuplido: string) {
    return this.http.post<any>(
      `${this.apiUrl}/subrogancias`,
      { profesor_id: profesorId, rol_suplido: rolSuplido },
      this.auth.getHeaders()
    );
  }

  desactivar(id: number) {
    return this.http.put<any>(`${this.apiUrl}/subrogancias/${id}/desactivar`, {}, this.auth.getHeaders());
  }

  miEstado() {
    return this.http.get<any>(`${this.apiUrl}/subrogancias/mi-estado`, this.auth.getHeaders());
  }
}

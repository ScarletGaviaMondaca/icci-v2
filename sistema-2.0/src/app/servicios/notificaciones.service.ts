import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar() {
    return this.http.get<any[]>(
      `${this.apiUrl}/notificaciones/seguimiento`,
      this.auth.getHeaders()
    );
  }

  noLeidas() {
    return this.http.get<{ total: number }>(
      `${this.apiUrl}/notificaciones/seguimiento/count`,
      this.auth.getHeaders()
    );
  }

  marcarLeida(id: number) {
    return this.http.put<any>(
      `${this.apiUrl}/notificaciones/seguimiento/${id}/leer`,
      {},
      this.auth.getHeaders()
    );
  }

  marcarTodasLeidas() {
    return this.http.put<any>(
      `${this.apiUrl}/notificaciones/seguimiento/leer-todas`,
      {},
      this.auth.getHeaders()
    );
  }

  listarProfesor(usuarioId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/notificaciones/profesor/${usuarioId}`,
      this.auth.getHeaders()
    );
  }

  noLeidasProfesor(usuarioId: number) {
    return this.http.get<{ total: number }>(
      `${this.apiUrl}/notificaciones/profesor/${usuarioId}/count`,
      this.auth.getHeaders()
    );
  }

  marcarLeidaProfesor(id: number) {
    return this.http.put<any>(
      `${this.apiUrl}/notificaciones/profesor/notif/${id}/leer`,
      {},
      this.auth.getHeaders()
    );
  }

  marcarTodasLeidasProfesor(usuarioId: number) {
    return this.http.put<any>(
      `${this.apiUrl}/notificaciones/profesor/${usuarioId}/leer-todas`,
      {},
      this.auth.getHeaders()
    );
  }

  listarEmpleador(usuarioId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/notificaciones/empleador/${usuarioId}`,
      this.auth.getHeaders()
    );
  }

  noLeidasEmpleador(usuarioId: number) {
    return this.http.get<{ total: number }>(
      `${this.apiUrl}/notificaciones/empleador/${usuarioId}/count`,
      this.auth.getHeaders()
    );
  }

  marcarLeidaEmpleador(id: number) {
    return this.http.put<any>(
      `${this.apiUrl}/notificaciones/empleador/notif/${id}/leer`,
      {},
      this.auth.getHeaders()
    );
  }

  marcarTodasLeidasEmpleador(usuarioId: number) {
    return this.http.put<any>(
      `${this.apiUrl}/notificaciones/empleador/${usuarioId}/leer-todas`,
      {},
      this.auth.getHeaders()
    );
  }
}

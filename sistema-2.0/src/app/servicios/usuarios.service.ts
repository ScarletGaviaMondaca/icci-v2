import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar() {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`, this.auth.getHeaders());
  }

  crear(data: { username: string; password: string; rol: string }) {
    return this.http.post<any>(`${this.apiUrl}/usuarios`, data, this.auth.getHeaders());
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}/toggle`, {}, this.auth.getHeaders());
  }

  cambiarPassword(id: number, password: string) {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, { password }, this.auth.getHeaders());
  }

  cambiarRol(id: number, rol: string) {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, { rol }, this.auth.getHeaders());
  }

  editar(data: any) {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${data.id}`, data, this.auth.getHeaders());
  }

  eliminar(id: number) {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}/toggle`, {}, this.auth.getHeaders());
  }

  getMiPerfil() {
    return this.http.get<any>(`${this.apiUrl}/usuarios/me`, this.auth.getHeaders());
  }

  actualizarPerfil(data: any) {
    return this.http.put<any>(`${this.apiUrl}/usuarios/me`, data, this.auth.getHeaders());
  }

  cambiarMiPassword(passwordActual: string, passwordNueva: string) {
    return this.http.put<any>(
      `${this.apiUrl}/usuarios/me`,
      { password: passwordNueva, passwordActual },
      this.auth.getHeaders()
    );
  }

  crearProfesor(profesor_id: number, password: string, rol: string, username: string) {
    return this.http.post<any>(
      `${this.apiUrl}/usuarios`,
      { profesor_id, password, rol, username },
      this.auth.getHeaders()
    );
  }

  getProfesoresSinUsuario() {
    return this.http.get<any[]>(`${this.apiUrl}/profesores?soloActivos=1`, this.auth.getHeaders());
  }

  buscarAlumnoPorRut(rut: string) {
    return this.http.get<any>(
      `${this.apiUrl}/alumnos/rut/${encodeURIComponent(rut)}`,
      this.auth.getHeaders()
    );
  }

  generarTokenEmpleador(correo: string) {
    return this.http.post<any>(
      `${this.apiUrl}/empleadores/generar-token`,
      { correo },
      this.auth.getHeaders()
    );
  }

  crearUsuariosAlumnos() {
    // Esta función masiva se puede implementar después
    return this.http.get<any>(`${this.apiUrl}/usuarios`, this.auth.getHeaders());
  }
}
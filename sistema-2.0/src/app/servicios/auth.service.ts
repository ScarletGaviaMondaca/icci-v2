import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private usuarioSubject = new BehaviorSubject<any>(this.cargarUsuario());
  usuario$ = this.usuarioSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(tap(res => {
        if (res.access_token) {
          // NestJS devuelve access_token en vez de token
          localStorage.setItem('token', res.access_token);
          // Construimos el objeto usuario desde la respuesta
          const usuario = {
            id: res.id,
            nombre: res.nombre,
            rol: res.rol,
            alumno_id: res.alumno_id,
            profesor_id: res.profesor_id,
            empleador_id: res.empleador_id,
            jefe_carrera_id: res.jefe_carrera_id,
          };
          localStorage.setItem('usuario', JSON.stringify(usuario));
          this.usuarioSubject.next(usuario);
        }
      }));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.usuarioSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsuario(): any {
    return this.usuarioSubject.value;
  }

  getRol(): string | null {
    return this.getUsuario()?.rol ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  esAdmin(): boolean { return this.getRol() === 'admin'; }
  esSecretaria(): boolean { return this.getRol() === 'secretaria'; }
  esAlumno(): boolean { return this.getRol() === 'alumno'; }
  esEmpleador(): boolean { return this.getRol() === 'empleador'; }
  esJefeCarrera(): boolean { return this.getRol() === 'jefe_carrera'; }
  esProfesor(): boolean { return this.getRol() === 'profesor'; }

  private cargarUsuario(): any {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  }

  getHeaders() {
    return {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    };
  }
}
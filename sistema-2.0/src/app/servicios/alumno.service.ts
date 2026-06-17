import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlumnoService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = 'http://localhost:3000';

  getAlumnos() {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos`, this.auth.getHeaders());
  }

  getAlumno(id: number) {
    return this.http.get<any>(`${this.apiUrl}/alumnos/${id}`, this.auth.getHeaders());
  }

  eliminarAlumno(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/alumnos/${id}`, this.auth.getHeaders());
  }

  actualizarAlumno(alumno: any) {
    return this.http.put<any>(`${this.apiUrl}/alumnos/${alumno.id}`, alumno, this.auth.getHeaders());
  }

  importarCSV(formData: FormData) {
    // Pendiente de implementar en NestJS
    return this.http.post<any>(`${this.apiUrl}/alumnos/importar`, formData, this.auth.getHeaders());
  }

  exportar(filtros: { rut?: string; nombre?: string; apellidos?: string; plan?: string; anio?: string }) {
    const params = new URLSearchParams();
    if (filtros.rut)       params.set('rut',       filtros.rut);
    if (filtros.nombre)    params.set('nombre',     filtros.nombre);
    if (filtros.apellidos) params.set('apellidos',  filtros.apellidos);
    if (filtros.plan)      params.set('plan',       filtros.plan);
    if (filtros.anio)      params.set('anio',       filtros.anio);
    return this.http.get(
      `${this.apiUrl}/alumnos/exportar?${params.toString()}`,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` }, responseType: 'blob' as const },
    );
  }

  exportarTodo() {
    return this.exportar({});
  }

  getPlantillaUrl(tipo: string): string {
    return `${this.apiUrl}/alumnos/plantilla?tipo=${tipo}`;
  }

  getAlumnosPorPlan(idPlan: number) {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos?plan=${idPlan}`, this.auth.getHeaders());
  }

  crearAlumno(alumno: any) {
    return this.http.post<any>(`${this.apiUrl}/alumnos`, alumno, this.auth.getHeaders());
  }

  crearAlumnoEspecial(data: {
    rut: string;
    nombres: string;
    apellido1: string;
    apellido2?: string;
    plan_texto: string;
    anio_ingreso?: number;
    anio_reingreso?: number;
  }) {
    return this.http.post<any>(`${this.apiUrl}/alumnos`, { ...data, tipo: 'especial' }, this.auth.getHeaders());
  }

  buscarAlumnos(query: string) {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos/search?q=${query}`, this.auth.getHeaders());
  }

  getAlumnosEspeciales() {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos/especiales`, this.auth.getHeaders());
  }
}
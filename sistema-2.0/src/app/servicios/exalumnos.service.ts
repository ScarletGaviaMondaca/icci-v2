import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { AuthService } from './auth.service';

export interface Exalumno {
  id?: number;
  rut: string;
  paterno: string;
  materno: string;
  nombres: string;
  anio_ingreso: number;
  anio_titulacion: number;
  nombre_carrera: string;
  facultad: string;
  nombre_titulo: string;
  emails: string[];
  telefonos: string[];
  trabajos?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ExalumnosService {

  private apiUrl = 'http://localhost:3000/exalumnos';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getExalumnos(): Observable<Exalumno[]> {
    return this.http.get<Exalumno[]>(this.apiUrl, this.auth.getHeaders());
  }

  getExalumno(id: number): Observable<Exalumno> {
    return this.http.get<Exalumno>(`${this.apiUrl}/${id}`, this.auth.getHeaders());
  }

  crearExalumno(data: Exalumno): Observable<any> {
    return this.http.post(this.apiUrl, data, this.auth.getHeaders());
  }

  actualizarExalumno(data: Exalumno): Observable<any> {
    return this.http.put(`${this.apiUrl}/${data.id}`, data, this.auth.getHeaders());
  }

  // TODO backend: implementar DELETE /exalumnos/:id en NestJS
  eliminarExalumno(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.auth.getHeaders());
  }

  // TODO backend: implementar POST /exalumnos/importar-csv en NestJS
  importarCSV(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/importar-csv`, formData, this.auth.getHeaders());
  }

  // TODO backend: implementar GET /exalumnos/exportar en NestJS
  exportarArchivo(tipo: string, filtros: any): Observable<any> {
    const p = new URLSearchParams();
    p.set('tipo', tipo);
    if (filtros.rut)      p.set('rut',      filtros.rut);
    if (filtros.nombre)   p.set('nombre',   filtros.nombre);
    if (filtros.apellidos) p.set('apellidos', filtros.apellidos);
    if (filtros.anio)     p.set('anio',     filtros.anio);

    return this.http.get(
      `${this.apiUrl}/exportar?${p.toString()}`,
      { ...this.auth.getHeaders(), responseType: 'blob' }
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CertificadoData {
  alumno_id: number;
  nombres: string;
  apellidos: string;
  alumno_nombre: string;
  rut: string;
  practica_num: number;
  empresa: string;
  fecha_inicio: string;
  fecha_termino: string;
  horas_totales: number;
  estado_final: number;
  herramientas: string;
  codigo_verificacion: string;
  pdf_url: string | null;
  pdf_fecha: string | null;
}

export interface AlumnoBusqueda {
  alumno_id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  alumno_nombre: string;
}

export interface ActividadItem {
  id: number;
  nombre: string;
  tipo: 'asignatura' | 'actividad';
}

export interface ListasActividades {
  asignaturas: ActividadItem[];
  actividades: ActividadItem[];
}

@Injectable({ providedIn: 'root' })
export class CertificadoService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    if (!token) console.warn('⚠ No hay token en localStorage');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAlumnosAprobados(): Observable<CertificadoData[]> {
    return this.http.get<CertificadoData[]>(
      `${this.apiUrl}/seguimiento/aprobados`,
      { headers: this.getAuthHeaders() }
    );
  }

  generarCertificado(payload: {
    alumno_rut: string;
    practica_num: number;
  }): Observable<{ ok: boolean; archivo: string; id: number }> {
    return this.http.post<{ ok: boolean; archivo: string; id: number }>(
      `${this.apiUrl}/generadores/certificado`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  getMisCertificados(): Observable<{ practicas: CertificadoData[], externos: any[] }> {
    return this.http.get<{ practicas: CertificadoData[], externos: any[] }>(
      `${this.apiUrl}/documentos/certificados/me`,
      { headers: this.getAuthHeaders() }
    );
  }

  guardarCertificado(payload: {
    pdf: string;
    alumno_rut: string;
    practica_num: number;
    nombre: string;
  }): Observable<{ ok: boolean; archivo: string; id: number }> {
    return this.http.post<{ ok: boolean; archivo: string; id: number }>(
      `${this.apiUrl}/documentos/certificados`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  getCertificado(alumnoId: number, practicaNum: number): Observable<CertificadoData> {
    return this.http.get<CertificadoData>(
      `${this.apiUrl}/documentos/certificados/lista?alumno_id=${alumnoId}&practica_num=${practicaNum}`,
      { headers: this.getAuthHeaders() }
    );
  }

  buscarAlumno(q: string): Observable<{ id: number; rut: string; nombre_completo: string }[]> {
    return this.http.get<{ id: number; rut: string; nombre_completo: string }[]>(
      `${this.apiUrl}/alumnos/search?q=${encodeURIComponent(q)}`,
      { headers: this.getAuthHeaders() }
    );
  }

  subirCertificadoExterno(formData: FormData): Observable<{ ok: boolean; archivo: string; codigo: string; id: number }> {
    return this.http.post<{ ok: boolean; archivo: string; codigo: string; id: number }>(
      `${this.apiUrl}/documentos/certificados-externos`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  getActividades(): Observable<ListasActividades> {
    return this.http.get<ListasActividades>(
      `${this.apiUrl}/documentos/actividades`,
      { headers: this.getAuthHeaders() }
    );
  }
}
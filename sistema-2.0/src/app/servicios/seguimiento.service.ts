import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar(practicaNum: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento?practica_num=${practicaNum}`,
      this.auth.getHeaders()
    );
  }

  updateCampo(payload: { alumno_id: number; plan: string; practica_num: number; campo: string; valor: any }) {
    // Buscar el seguimiento_id desde el alumno_id
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/campo`,
      payload,
      this.auth.getHeaders()
    );
  }

  importarCSV(file: File, practicaNum: number) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('practica_num', String(practicaNum));
    return this.http.post<any>(`${this.apiUrl}/seguimiento/importar`, fd, this.auth.getHeaders());
  }

  obtenerAlumno(id: number, practicaNum: number) {
    return this.http.get<any>(
      `${this.apiUrl}/seguimiento/alumno/${id}?practica_num=${practicaNum}`,
      this.auth.getHeaders()
    );
  }
  getCandidatos() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/candidatos`,
      this.auth.getHeaders()
    );
  }

  agregarFechaObservacion(payload: {
    seguimiento_id: number;
    hito: string;
    fecha_recepcion: string;
    fecha_fin_recepcion?: string;
  }) {
    return this.http.post<any>(
      `${this.apiUrl}/seguimiento/${payload.seguimiento_id}/observacion`,
      payload,
      this.auth.getHeaders()
    );
  }

  actualizaHito3(payload: {
    seguimiento_id: number;
    profesor_id: number;
    carta_peticion: string;
    carta_asignacion: string;
  }) {
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/${payload.seguimiento_id}`,
      {
        informe_rev_profesor_id: payload.profesor_id,
        informe_rev_carta_peticion: payload.carta_peticion,
        informe_rev_carta_asignacion: payload.carta_asignacion,
      },
      this.auth.getHeaders()
    );
  }

  actualizarFechaFin(obs_id: number, fecha_fin_recepcion: string) {
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/observacion/${obs_id}`,
      { fecha_fin_recepcion },
      this.auth.getHeaders()
    );
  }

  getProfesores() {
    return this.http.get<any[]>(`${this.apiUrl}/profesores?soloActivos=1`, this.auth.getHeaders());
  }

  getFechasObservacion(seguimientoId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/${seguimientoId}/observaciones`,
      this.auth.getHeaders()
    );
  }

  getSeguimiento(id: number) {
    return this.http.get<any>(`${this.apiUrl}/seguimiento/${id}`, this.auth.getHeaders());
  }

  subirInforme(formData: FormData) {
    return this.http.post<any>(`${this.apiUrl}/seguimiento/informe`, formData, this.auth.getHeaders());
  }

  evaluarInforme(formData: FormData) {
    return this.http.post<any>(`${this.apiUrl}/seguimiento/evaluar-informe`, formData, this.auth.getHeaders());
  }

  getEvaluacion(seguimientoId: number) {
    return this.http.get<any>(`${this.apiUrl}/seguimiento/${seguimientoId}/evaluacion`, this.auth.getHeaders());
  }

  subirEvalEmpresa(formData: FormData) {
    return this.http.post<any>(`${this.apiUrl}/seguimiento/eval-empresa`, formData, this.auth.getHeaders());
  }

  getMiSeguimiento(alumnoId: number, practica_num: number = 1) {
    return this.http.get<any>(
      `${this.apiUrl}/seguimiento/alumno/${alumnoId}?practica_num=${practica_num}`,
      this.auth.getHeaders()
    );
  }

  exportar(tipo: string, filtros: any) {
    const params = new URLSearchParams();
    params.set('tipo', tipo);
    if (filtros.rut)        params.set('rut',         filtros.rut);
    if (filtros.nombre)     params.set('nombre',       filtros.nombre);
    if (filtros.plan)       params.set('plan',         filtros.plan);
    if (filtros.practicaNum) params.set('practica_num', String(filtros.practicaNum));
    return this.http.get(
      `${this.apiUrl}/seguimiento/exportar?${params.toString()}`,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` }, responseType: 'blob' as const },
    );
  }

  getAprobados(rut = '', anio = '') {
    const params = new URLSearchParams();
    if (rut) params.set('rut', rut);
    if (anio) params.set('anio', anio);
    return this.http.get<{ practica1: any[]; practica2: any[] }>(
      `${this.apiUrl}/seguimiento/informes?${params.toString()}`,
      this.auth.getHeaders()
    );
  }

  subirActaFirmada(formData: FormData) {
    return this.http.post<any>(`${this.apiUrl}/seguimiento/acta`, formData, this.auth.getHeaders());
  }

  getAniosAprobacion() {
    return this.http.get<number[]>(
      `${this.apiUrl}/seguimiento/anios`,
      this.auth.getHeaders()
    );
  }

  getDuraciones() {
    return this.http.get<any[]>(`${this.apiUrl}/seguimiento/duraciones`, this.auth.getHeaders());
  }

  generarCartaSolicitud(seguimientoId: number) {
    return this.http.get<any>(
      `${this.apiUrl}/generadores/carta-solicitud?seguimiento_id=${seguimientoId}`,
      this.auth.getHeaders()
    );
  }

  evaluarEmpresa(body: any) {
    return this.http.post<any>(`${this.apiUrl}/seguimiento/evaluar-empresa`, body, this.auth.getHeaders());
  }

  getEvaluacionEmpresa(seguimientoId: number) {
    return this.http.get<any>(`${this.apiUrl}/seguimiento/${seguimientoId}/evaluacion-empresa`, this.auth.getHeaders());
  }

  generarInformeConfidencial(seguimientoId: number) {
    return this.http.get(
      `${this.apiUrl}/generadores/informe-confidencial?seguimiento_id=${seguimientoId}`,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` }, responseType: 'blob' as const }
    );
  }

  getEvaluacionesEmpleador(usuarioId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/evaluaciones-empleador?usuario_id=${usuarioId}`,
      this.auth.getHeaders()
    );
  }

  generarFormularioRevision(seguimientoId: number) {
    return this.http.get(
      `${this.apiUrl}/generadores/formulario-revision?seguimiento_id=${seguimientoId}`,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` }, responseType: 'blob' as const }
    );
  }
}
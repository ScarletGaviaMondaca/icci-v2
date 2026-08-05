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

  getEnCurso() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/en-curso`,
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

  getAlumnosEmpresa(usuarioId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/alumnos-empresa?usuario_id=${usuarioId}`,
      this.auth.getHeaders()
    );
  }

  generarFormularioRevision(seguimientoId: number) {
    return this.http.get(
      `${this.apiUrl}/generadores/formulario-revision?seguimiento_id=${seguimientoId}`,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` }, responseType: 'blob' as const }
    );
  }

  // ── Hito 3: solicitud de profesor evaluador ────────────────────────

  solicitarProfesorEvaluador(seguimientoId: number) {
    return this.http.post<any>(
      `${this.apiUrl}/seguimiento/${seguimientoId}/solicitar-profesor`,
      {},
      this.auth.getHeaders()
    );
  }

  getEvaluacionInformes() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/evaluacion-informes`,
      this.auth.getHeaders()
    );
  }

  getAlumnosEvaluados() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/alumnos-evaluados`,
      this.auth.getHeaders()
    );
  }

  getPendientesAsignacionAcademico() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/pendientes-asignacion-academico`,
      this.auth.getHeaders()
    );
  }

  proponerProfesoresEvaluadores(asignaciones: { seguimiento_id: number; profesor_id: number }[]) {
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/proponer-profesores`,
      { asignaciones },
      this.auth.getHeaders()
    );
  }

  getListosParaActa() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/listos-para-acta`,
      this.auth.getHeaders()
    );
  }

  getResumenProfesorEvaluador() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/resumen-profesor-evaluador`,
      this.auth.getHeaders()
    );
  }

  getComitePendientes() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/comite-pendientes`,
      this.auth.getHeaders()
    );
  }

  decidirComite(seguimientoId: number, decision: 'aprobado' | 'rechazado') {
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/${seguimientoId}/comite`,
      { decision },
      this.auth.getHeaders()
    );
  }

  getComiteRechazados() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/comite-rechazados`,
      this.auth.getHeaders()
    );
  }

  getInformesAtrasados() {
    return this.http.get<any[]>(
      `${this.apiUrl}/seguimiento/informes-atrasados`,
      this.auth.getHeaders()
    );
  }

  enviarComiteAtrasado(seguimientoId: number) {
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/${seguimientoId}/enviar-comite-atrasado`,
      {},
      this.auth.getHeaders()
    );
  }

  eliminarSeguimiento(seguimientoId: number) {
    return this.http.delete<any>(
      `${this.apiUrl}/seguimiento/${seguimientoId}`,
      this.auth.getHeaders()
    );
  }

  solicitarProfesorEvaluadorBulk(seguimientoIds: number[]) {
    return this.http.post<any>(
      `${this.apiUrl}/seguimiento/evaluacion-informes/solicitar`,
      { seguimiento_ids: seguimientoIds },
      this.auth.getHeaders()
    );
  }

  asignarProfesorEvaluador(seguimientoId: number, profesorId: number) {
    return this.http.put<any>(
      `${this.apiUrl}/seguimiento/${seguimientoId}/asignar-profesor`,
      { profesor_id: profesorId },
      this.auth.getHeaders()
    );
  }

  generarListaProfesorEvaluador(seguimientoIds: number[], numeroCarta: string) {
    const params = new URLSearchParams();
    params.set('seguimiento_ids', seguimientoIds.join(','));
    params.set('numero_carta', numeroCarta);
    return this.http.get(
      `${this.apiUrl}/generadores/lista-profesor-evaluador?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.auth.getToken()}` },
        responseType: 'blob' as const,
        observe: 'response' as const,
      }
    );
  }

  generarActaAcademicoEvaluador(seguimientoIds: number[], diciNumero: string) {
    const params = new URLSearchParams();
    params.set('seguimiento_ids', seguimientoIds.join(','));
    params.set('dici_numero', diciNumero);
    return this.http.get(
      `${this.apiUrl}/generadores/acta-academico-evaluador?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.auth.getToken()}` },
        responseType: 'blob' as const,
        observe: 'response' as const,
      }
    );
  }

  listarSolicitudesIcci(seguimientoIds: number[]) {
    return this.http.get<any[]>(
      `${this.apiUrl}/generadores/solicitudes-icci?seguimiento_ids=${seguimientoIds.join(',')}`,
      this.auth.getHeaders()
    );
  }
}
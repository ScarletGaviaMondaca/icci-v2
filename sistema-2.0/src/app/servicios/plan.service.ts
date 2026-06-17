import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private apiUrl = 'http://localhost:3000/plan';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getPlan(id: number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`, this.auth.getHeaders());
  }

  listarPlanes() {
    return this.http.get<any[]>(this.apiUrl, this.auth.getHeaders());
  }

  getMalla(id: number) {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/malla`, this.auth.getHeaders());
  }

  getRestricciones(planId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/${planId}/restricciones`, this.auth.getHeaders());
  }

  // TODO backend: implementar POST /plan en NestJS
  crearPlan(data: any) {
    return this.http.post<any>(this.apiUrl, data, this.auth.getHeaders());
  }

  // TODO backend: implementar PUT /plan/:id en NestJS
  actualizarPlan(id: number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data, this.auth.getHeaders());
  }

  // TODO backend: implementar DELETE /plan/:id en NestJS
  eliminarPlan(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.auth.getHeaders());
  }

  // TODO backend: implementar POST /plan/importar-malla en NestJS (con Multer)
  subirMallaCSV(formData: FormData) {
    return this.http.post<any>(
      `${this.apiUrl}/importar-malla`,
      formData,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` } }
    );
  }

  // TODO backend: implementar GET /plan/:id/exportar-malla en NestJS
  exportarMallaCSV(planId: number) {
    return this.http.get(
      `${this.apiUrl}/${planId}/exportar-malla`,
      { ...this.auth.getHeaders(), responseType: 'blob' }
    );
  }

  // TODO backend: implementar GET /plan/:id/exportar-malla-excel en NestJS
  exportarMallaExcel(planId: number) {
    return this.http.get(
      `${this.apiUrl}/${planId}/exportar-malla-excel`,
      { ...this.auth.getHeaders(), responseType: 'blob' }
    );
  }

  // TODO backend: implementar GET /plan/:id/exportar-pdf en NestJS
  exportarMallaPDF(planId: number) {
    return this.http.get(
      `${this.apiUrl}/${planId}/exportar-pdf`,
      { ...this.auth.getHeaders(), responseType: 'blob' }
    );
  }

  // TODO backend: implementar GET /plan/plantilla-restricciones en NestJS
  descargarPlantillaRestricciones() {
    return this.http.get(
      `${this.apiUrl}/plantilla-restricciones`,
      { ...this.auth.getHeaders(), responseType: 'blob' }
    );
  }

  // TODO backend: implementar POST /plan/restricciones en NestJS
  crearRestriccion(data: { plan_id: number; ramo_codigo: string; req_codigo: string; tipo: 'PRE' | 'CO' }) {
    return this.http.post<any>(`${this.apiUrl}/restricciones`, data, this.auth.getHeaders());
  }

  // TODO backend: implementar DELETE /plan/restricciones/:id en NestJS
  eliminarRestriccion(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/restricciones/${id}`, this.auth.getHeaders());
  }

  // TODO backend: implementar POST /plan/importar-restricciones en NestJS
  importarRestriccionesCSV(planId: number, file: File) {
    const fd = new FormData();
    fd.append('plan_id', String(planId));
    fd.append('file', file);
    return this.http.post(
      `${this.apiUrl}/importar-restricciones`,
      fd,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` } }
    );
  }

  importarRestriccionesFD(fd: FormData) {
    return this.http.post(
      `${this.apiUrl}/importar-restricciones`,
      fd,
      { headers: { Authorization: `Bearer ${this.auth.getToken()}` } }
    );
  }
}

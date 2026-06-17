import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

// TODO backend: crear módulo InfoCarreraModule en NestJS con GET y PUT /info-carrera
// El backend PHP devolvía { success, data: InfoCarrera }; NestJS debe devolver InfoCarrera directamente

export interface InfoCarrera {
  id: number;
  nombre: string;
  codigo_demre: string;
  grado_titulo: string;
  facultad: string;
  departamento: string;
  director: string;
  duracion: string;
  modalidad: string;
  jornada: string;
  sede: string;
  anio_creacion: string;
  ultima_modif_plan: string;
  perfil_egreso: string;
}

@Injectable({
  providedIn: 'root'
})
export class InfoService {
  private apiUrl = 'http://localhost:3000/info-carrera';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getInfoCarrera(): Observable<InfoCarrera> {
    return this.http.get<InfoCarrera>(this.apiUrl, this.auth.getHeaders());
  }

  updateInfoCarrera(datos: InfoCarrera): Observable<any> {
    return this.http.put<any>(this.apiUrl, datos, this.auth.getHeaders());
  }
}

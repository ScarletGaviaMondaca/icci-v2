import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfesoresService {
  private apiUrl = 'http://localhost:3000/profesores';

  constructor(private http: HttpClient, private auth: AuthService) {}

  listarActivos() {
    return this.http.get<any[]>(`${this.apiUrl}?soloActivos=1`, this.auth.getHeaders());
  }

  listar() {
    return this.http.get<any[]>(this.apiUrl, this.auth.getHeaders());
  }

  crear(data: { nombre: string; apellido1: string; apellido2: string }) {
    return this.http.post<any>(this.apiUrl, data, this.auth.getHeaders());
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.apiUrl}/${id}/toggle`, {}, this.auth.getHeaders());
  }

  // TODO backend: implementar DELETE /profesores/:id en NestJS
  eliminar(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.auth.getHeaders());
  }

  editar(data: { id: number; nombre: string; apellido1: string; apellido2: string; correo: string; activo: number; foto: string }) {
    return this.http.put<any>(`${this.apiUrl}/${data.id}`, data, this.auth.getHeaders());
  }

  // TODO backend: implementar GET /profesores/tipos en NestJS
  listarTipos() {
    return this.http.get<string[]>(`${this.apiUrl}/tipos`, this.auth.getHeaders());
  }

  // TODO backend: implementar PUT /profesores/:id/foto en NestJS (con Multer)
  subirFoto(id: number, foto: File) {
    const fd = new FormData();
    fd.append('foto', foto);
    const headers = { Authorization: `Bearer ${this.auth.getToken()}` };
    return this.http.put<any>(`${this.apiUrl}/${id}/foto`, fd, { headers });
  }
}

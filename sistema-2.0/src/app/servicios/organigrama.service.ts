import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OrganigramaService {
  private apiUrl = 'http://localhost:3000/organigrama';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getMiembros() {
    return this.http.get<any[]>(this.apiUrl, this.auth.getHeaders());
  }

  crearMiembro(formData: FormData) {
    return this.http.post(this.apiUrl, formData, this.auth.getHeaders());
  }

  actualizarMiembro(formData: FormData) {
    const id = formData.get('id');
    const accion = formData.get('accion');

    if (accion === 'eliminar') {
      return this.http.delete(`${this.apiUrl}/${id}`, this.auth.getHeaders());
    }
    if (accion === 'crear') {
      return this.http.post(this.apiUrl, formData, this.auth.getHeaders());
    }
    // editar
    return this.http.put(`${this.apiUrl}/${id}`, formData, this.auth.getHeaders());
  }
}
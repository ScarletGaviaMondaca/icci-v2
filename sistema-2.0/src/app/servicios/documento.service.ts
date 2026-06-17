import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar() {
    return this.http.get<any[]>(`${this.apiUrl}/documentos`, this.auth.getHeaders());
  }

  categorias() {
    return this.http.get<string[]>(`${this.apiUrl}/documentos/categorias`, this.auth.getHeaders());
  }

  subir(formData: FormData) {
    return this.http.post<any>(`${this.apiUrl}/documentos`, formData, this.auth.getHeaders());
  }

  eliminar(id: number) {
    return this.http.put<any>(`${this.apiUrl}/documentos/${id}/toggle`, {}, this.auth.getHeaders());
  }

  getDescargaUrl(id: number): string {
    return `${this.apiUrl}/documentos/${id}/descargar`;
  }
}
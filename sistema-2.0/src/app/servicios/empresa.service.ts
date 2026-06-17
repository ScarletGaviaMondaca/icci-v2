import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar() {
    return this.http.get<any[]>(`${this.apiUrl}/empresas`, this.auth.getHeaders());
  }

  listaConAlumnos() {
    return this.http.get<any[]>(`${this.apiUrl}/empresas`, this.auth.getHeaders());
  }

  crear(nombre: string) {
    return this.http.post<any>(`${this.apiUrl}/empresas`, { nombre }, this.auth.getHeaders());
  }

  editar(id: number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/empresas/${id}`, data, this.auth.getHeaders());
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.apiUrl}/empresas/${id}/toggle`, {}, this.auth.getHeaders());
  }

  findOne(id: number) {
    return this.http.get<any>(`${this.apiUrl}/empresas/${id}`, this.auth.getHeaders());
  }
}
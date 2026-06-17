import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OfertasService {
  private apiUrl     = 'http://localhost:3000';
  private ofertasUrl  = `${this.apiUrl}/ofertas`;
  private empresasUrl = `${this.apiUrl}/empresas`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  // ── Empleadores ──────────────────────────────────────────────────────────────

  // TODO backend: implementar GET /empleadores en NestJS (actualmente solo existe GET /empresas/:id/empleadores)
  listarEmpleadores() {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores`, this.auth.getHeaders());
  }

  // TODO backend: implementar POST /empleadores/generar-token en NestJS
  generarToken(correo: string) {
    return this.http.post<any>(
      `${this.apiUrl}/empleadores/generar-token`,
      { correo },
      this.auth.getHeaders()
    );
  }

  // TODO backend: implementar GET /empleadores/validar-token en NestJS
  validarToken(token: string) {
    return this.http.get<any>(`${this.apiUrl}/empleadores/validar-token?token=${token}`);
  }

  // TODO backend: implementar POST /empleadores/registro en NestJS
  registrarEmpleador(data: any) {
    return this.http.post<any>(`${this.apiUrl}/empleadores/registro`, data);
  }

  // ── Empresas (con auth — para admin) ─────────────────────────────────────────

  listarEmpresas() {
    return this.http.get<any[]>(this.empresasUrl, this.auth.getHeaders());
  }

  crearEmpresa(nombre: string) {
    return this.http.post<any>(this.empresasUrl, { nombre }, this.auth.getHeaders());
  }

  // ── Empresas públicas (sin auth — para registro de empleador) ─────────────────

  listarEmpresasPublico() {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/empresas`);
  }

  crearEmpresaPublico(nombre: string) {
    return this.http.post<any>(`${this.apiUrl}/empleadores/empresas`, { nombre });
  }

  // ── Documento de compromiso ───────────────────────────────────────────────────

  getCompromiso() {
    return this.http.get<{ existe: boolean; url: string | null }>(`${this.apiUrl}/empleadores/compromiso`);
  }

  subirCompromiso(archivo: File) {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<any>(`${this.apiUrl}/empleadores/compromiso/subir`, fd, this.auth.getHeaders());
  }

  // ── Ofertas ──────────────────────────────────────────────────────────────────

  // alumnoId se usa para filtrar (TODO backend: soportar query param ?alumno_id=)
  listarOfertas(alumnoId: number = 0) {
    const params = alumnoId ? `?alumno_id=${alumnoId}` : '';
    return this.http.get<any[]>(`${this.ofertasUrl}${params}`, this.auth.getHeaders());
  }

  // TODO backend: implementar GET /ofertas?empleador_id=:id en NestJS
  misOfertas(empleador_id: number) {
    return this.http.get<any[]>(
      `${this.ofertasUrl}?empleador_id=${empleador_id}`,
      this.auth.getHeaders()
    );
  }

  crearOferta(data: any) {
    return this.http.post<any>(this.ofertasUrl, data, this.auth.getHeaders());
  }

  actualizarOferta(id: number, data: any) {
    return this.http.put<any>(`${this.ofertasUrl}/${id}`, data, this.auth.getHeaders());
  }

  desactivarOferta(id: number) {
    return this.http.put<any>(`${this.ofertasUrl}/${id}/toggle`, {}, this.auth.getHeaders());
  }

  // ── Postulaciones ─────────────────────────────────────────────────────────────

  postular(oferta_id: number, alumno_id: number, practica_num: number = 1) {
    return this.http.post<any>(
      `${this.ofertasUrl}/${oferta_id}/postular`,
      { alumno_id, practica_num },
      this.auth.getHeaders()
    );
  }

  // El detalle de la oferta incluye sus postulaciones (GET /ofertas/:id)
  listarPostulaciones(oferta_id: number) {
    return this.http.get<any>(`${this.ofertasUrl}/${oferta_id}`, this.auth.getHeaders());
  }

  resolver(postulacion_id: number, estado: string, motivo: string = '') {
    return this.http.put<any>(
      `${this.ofertasUrl}/postulaciones/${postulacion_id}`,
      { estado, motivo_rechazo: motivo },
      this.auth.getHeaders()
    );
  }

  // TODO backend: implementar GET /ofertas/todas-postulaciones en NestJS
  listarTodasPostulaciones() {
    return this.http.get<any[]>(
      `${this.ofertasUrl}/todas-postulaciones`,
      this.auth.getHeaders()
    );
  }

  // TODO backend: implementar GET /ofertas/verificar-candidato?alumno_id= en NestJS
  verificarCandidato(alumnoId: number) {
    return this.http.get<any>(
      `${this.ofertasUrl}/verificar-candidato?alumno_id=${alumnoId}`,
      this.auth.getHeaders()
    );
  }
}

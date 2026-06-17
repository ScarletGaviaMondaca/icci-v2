import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Building } from '../alumno/mapa/mapa';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MapaService {

  private apiUrl = 'http://localhost:3000/mapa';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getAll(): Observable<Building[]> {
    return this.http.get<any[]>(this.apiUrl, this.auth.getHeaders()).pipe(
      map(data => data.map(b => this.mapear(b)))
    );
  }

  getById(id: string): Observable<Building> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, this.auth.getHeaders()).pipe(
      map(b => this.mapear(b))
    );
  }

  update(id: string, building: Building): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, this.desmapear(building), this.auth.getHeaders());
  }

  create(building: Building): Observable<any> {
    return this.http.post(this.apiUrl, this.desmapear(building), this.auth.getHeaders());
  }

  private mapear(b: any): Building {
    return {
      id:    b.id,
      label: b.label,
      type:  b.type,
      x:     parseFloat(b.x),
      y:     parseFloat(b.y),
      name:  b.nombre,
      desc:  b.descripcion,
      contact: {
        phone:   b.telefono   ?? undefined,
        email:   b.correo     ?? undefined,
        web:     b.web        ?? undefined,
        address: b.direccion  ?? undefined,
        hours:   b.horario    ?? undefined,
      }
    };
  }

  private desmapear(b: Building): any {
    return {
      id:          b.id,
      label:       b.label,
      type:        b.type,
      x:           b.x,
      y:           b.y,
      nombre:      b.name,
      descripcion: b.desc,
      telefono:    b.contact.phone    ?? null,
      correo:      b.contact.email    ?? null,
      web:         b.contact.web      ?? null,
      direccion:   b.contact.address  ?? null,
      horario:     b.contact.hours    ?? null,
    };
  }
}

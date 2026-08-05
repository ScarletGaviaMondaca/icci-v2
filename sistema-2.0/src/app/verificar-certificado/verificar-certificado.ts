import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

interface ResultadoVerificacion {
  valido: boolean;
  mensaje?: string;
  tipo?: string;
  nombre?: string;
  alumno_nombre?: string;
  alumno_rut?: string;
  empresa?: string;
  fecha_emision?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  horas_totales?: number;
  practica_num?: number;
  creado_por?: string;
  pdf_url?: string;
}

@Component({
  selector: 'app-verificar-certificado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verificar-certificado.html',
  styleUrls: ['./verificar-certificado.css']
})
export class VerificarCertificado {

  codigo: string   = '';
  buscando         = false;
  resultado: ResultadoVerificacion | null = null;
  error: string    = '';

  private nestBase = 'http://localhost:3000';
  readonly baseUrl = 'http://localhost/';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  // Detecta si el código es hexadecimal (informes) o numérico (certificados)
  private esCodigoHex(codigo: string): boolean {
    return /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/i.test(codigo.trim());
  }

  verificar(): void {
    const codigo = this.codigo.trim();
    if (!codigo) {
      this.error = 'Ingresa un código de verificación.';
      return;
    }

    this.buscando  = true;
    this.resultado = null;
    this.error     = '';
    this.cdr.detectChanges();

    if (this.esCodigoHex(codigo)) {
      // Código de informe (XXXX-XXXX-XXXX hex) → API NestJS
      this.http.get<ResultadoVerificacion>(
        `${this.nestBase}/seguimiento/verificar-documento?codigo=${encodeURIComponent(codigo)}`
      ).subscribe({
        next: (res) => {
          this.buscando  = false;
          this.resultado = res;
          this.cdr.detectChanges();
        },
        error: () => {
          this.buscando = false;
          this.error    = 'Error al conectar con el servidor.';
          this.cdr.detectChanges();
        }
      });
    } else {
      // Código numérico → certificado via NestJS
      this.http.get<ResultadoVerificacion>(
        `${this.nestBase}/seguimiento/verificar-certificado?codigo=${encodeURIComponent(codigo)}`
      ).subscribe({
        next: (res) => {
          this.buscando  = false;
          this.resultado = res;
          this.cdr.detectChanges();
        },
        error: () => {
          this.buscando = false;
          this.error    = 'Error al conectar con el servidor.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  limpiar(): void {
    this.codigo    = '';
    this.resultado = null;
    this.error     = '';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }

  tipoLabel(tipo?: string): string {
    if (tipo === 'informe_confidencial')        return 'Informe Confidencial de Práctica';
    if (tipo === 'formulario_revision')         return 'Formulario de Revisión del Informe';
    if (tipo === 'solicitud_profesor_evaluador') return 'Solicitud de Profesor Evaluador';
    if (tipo === 'acta_academico_evaluador')    return 'Acta de Designación de Académico Evaluador';
    if (tipo === 'practica')                    return 'Certificado de Práctica Profesional';
    return 'Certificado';
  }

  onInput(): void {
    // Permite tanto numérico (certificados) como hex (informes)
    let val = this.codigo.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

    if (/^[0-9]+$/.test(val)) {
      // Modo numérico: formato 000-000-000
      if (val.length > 3 && val.length <= 6)
        this.codigo = val.slice(0, 3) + '-' + val.slice(3);
      else if (val.length > 6)
        this.codigo = val.slice(0, 3) + '-' + val.slice(3, 6) + '-' + val.slice(6, 9);
      else
        this.codigo = val;
    } else {
      // Modo hex: formato XXXX-XXXX-XXXX
      if (val.length > 4 && val.length <= 8)
        this.codigo = val.slice(0, 4) + '-' + val.slice(4);
      else if (val.length > 8)
        this.codigo = val.slice(0, 4) + '-' + val.slice(4, 8) + '-' + val.slice(8, 12);
      else
        this.codigo = val;
    }
  }
}

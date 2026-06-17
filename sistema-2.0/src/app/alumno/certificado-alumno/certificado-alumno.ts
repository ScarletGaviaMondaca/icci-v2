import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { CertificadoService, CertificadoData } from '../../servicios/certificado.service';

interface PracticaSlot {
  num: 1 | 2;
  cert: CertificadoData | null;
}

export interface CertificadoExterno {
  id: number;
  nombre: string;
  fecha_emision: string;
  pdf_url: string;
  codigo: string;
  display: string;
  fecha_subida: string;
}

@Component({
  selector: 'app-certificado-alumno',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificado-alumno.html',
  styleUrls: ['./certificado-alumno.css']
})
export class CertificadoAlumno implements OnInit {

  practicasSlots: PracticaSlot[] = [
    { num: 1, cert: null },
    { num: 2, cert: null }
  ];
  externos: CertificadoExterno[] = [];

  cargando = false;
  error    = '';

  private readonly baseUrl = 'http://localhost/';

  constructor(
    private certificadoService: CertificadoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCertificados();
  }

  cargarCertificados(): void {
    this.cargando = true;
    this.error    = '';

    this.certificadoService.getMisCertificados().subscribe({
      next: (res: any) => {
        const practicas: CertificadoData[] = res.practicas ?? [];
        this.externos                       = res.externos  ?? [];
        this.construirSlots(practicas);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.error    = 'No se pudieron cargar tus certificados.';
        this.cdr.detectChanges();
      }
    });
  }

  private construirSlots(practicas: CertificadoData[]): void {
    const p1 = practicas.find(c => c.practica_num === 1) ?? null;
    const p2 = practicas.find(c => c.practica_num === 2) ?? null;
    this.practicasSlots = [
      { num: 1, cert: p1 },
      { num: 2, cert: p2 }
    ];
  }

  // ── Descarga el PDF generado por PHP desde el servidor ──
  descargarPractica(cert: CertificadoData): void {
    if (!cert.pdf_url) {
      this.error = 'El certificado aún no ha sido generado por el coordinador.';
      return;
    }
    window.open(this.baseUrl + cert.pdf_url, '_blank');
  }

  // ── Descarga certificado externo ────────────────────────
  descargarExterno(ext: CertificadoExterno): void {
    window.open(this.baseUrl + ext.pdf_url, '_blank');
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }
}
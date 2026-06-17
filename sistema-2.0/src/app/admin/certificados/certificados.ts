import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { CertificadoService, CertificadoData } from '../../servicios/certificado.service';

@Component({
  selector: 'app-certificados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './certificados.html',
  styleUrls: ['./certificados.css']
})
export class Certificados implements OnInit {

  listaCompleta: CertificadoData[] = [];
  listaFiltrada: CertificadoData[]  = [];
  cargandoLista: boolean = false;
  errorLista: string     = '';
  textoBusqueda: string  = '';
  generando: number | null = null;
  filtroPractica: number = 0;
  paginaActual = 1;
  itemsPorPagina = 20;

  constructor(
    private certificadoService: CertificadoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarLista();
  }

  cargarLista(): void {
    this.cargandoLista = true;
    this.errorLista    = '';

    this.certificadoService.getAlumnosAprobados().subscribe({
      next: (data) => {
        this.cargandoLista = false;
        this.listaCompleta = data;
        this.listaFiltrada = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoLista = false;
        this.errorLista = 'No se pudo cargar la lista de alumnos.';
      }
    });
  }
  filtrar(): void {
    this.paginaActual = 1; 
    this.listaFiltrada = this.listaCompleta.filter(item => {
      const texto = this.textoBusqueda.toLowerCase();
      const coincideTexto =
        item.alumno_nombre?.toLowerCase().includes(texto) ||
        item.rut?.toLowerCase().includes(texto) ||
        item.empresa?.toLowerCase().includes(texto);

      // filtro por número de práctica
      const coincidePractica = 
        this.filtroPractica === 0 || item.practica_num === this.filtroPractica;

      return coincideTexto && coincidePractica;
    });
  }

  filtrarPorPractica(num: number): void {
    this.filtroPractica = num;
    this.filtrar();
  }

  descargar(item: CertificadoData): void {
    this.generando  = item.practica_num;
    this.errorLista = '';

    this.certificadoService.generarCertificado({
      alumno_rut:   item.rut,
      practica_num: item.practica_num
    }).subscribe({
      next: (res) => {
        this.generando = null;
        this.cdr.detectChanges();
        // Abre el PDF generado por PHP en nueva pestaña
        window.open('http://localhost/' + res.archivo, '_blank');
      },
      error: () => {
        this.generando  = null;
        this.errorLista = 'Error al generar el certificado. Intenta nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  datosPaginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaFiltrada.slice(inicio, inicio + this.itemsPorPagina);
  }

  totalPaginas() {
    return Math.max(1, Math.ceil(this.listaFiltrada.length / this.itemsPorPagina));
  }

  paginasArray() {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }

  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas()) this.paginaActual = p;
  }
}
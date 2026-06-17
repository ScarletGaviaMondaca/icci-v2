import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentoService } from '../../../../servicios/documento.service';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../../servicios/auth.service';

@Component({
  selector: 'app-reglamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reglamentos.html',
  styleUrl: './reglamentos.css',
})
export class Reglamentos implements OnInit {
  private docService = inject(DocumentoService);
  private cdr = inject(ChangeDetectorRef);
  public auth: AuthService = inject(AuthService);

  // --- Datos ---
  documentos: any[] = [];
  categorias: string[] = [];

  // --- Filtros ---
  filtroNombre = '';
  filtroCategoria = '';

  // --- Modal subir ---
  mostrarModal = false;
  subiendo = false;
  mensajeSubida = '';

  // --- Form nuevo documento ---
  nuevoNombre = '';
  nuevaCategoria = '';
  nuevaCategoriaManual = '';   // si escribe una categoría nueva
  archivoSeleccionado: File | null = null;
  nombreArchivo = '';

  // --- Confirmación eliminar ---
  mostrarConfirmacion = false;
  docAEliminar: { id: number; nombre: string } | null = null;

  ngOnInit(): void {
    this.cargar();
    this.cdr.detectChanges(); 
   }

  cargar(): void {
    this.docService.listar().subscribe({
      next: (data) => {
        this.documentos = data;
        // Extrae categorías únicas desde los datos
        this.categorias = [...new Set(data.map(d => d.categoria))].sort();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar documentos:', err)
    });
  }

  // --- Filtrar ---
  documentosFiltrados(): any[] {
    const nom = this.filtroNombre.toLowerCase();
    const cat = this.filtroCategoria.toLowerCase();
    return this.documentos.filter(d =>
      d.nombre.toLowerCase().includes(nom) &&
      d.categoria.toLowerCase().includes(cat)
    );
  }

  // --- Agrupar por categoría ---
  categoriasFiltradas(): string[] {
    const cats = this.documentosFiltrados().map(d => d.categoria);
    return [...new Set(cats)].sort();
  }

  documentosPorCategoria(cat: string): any[] {
    return this.documentosFiltrados().filter(d => d.categoria === cat);
  }

  // --- Descargar ---
  descargar(id: number): void {
    window.open(this.docService.getDescargaUrl(id), '_blank');
  }

  // --- Modal subir ---
  abrirModal(): void {
    this.mostrarModal = true;
    this.mensajeSubida = '';
    this.nuevoNombre = '';
    this.nuevaCategoria = '';
    this.nuevaCategoriaManual = '';
    this.archivoSeleccionado = null;
    this.nombreArchivo = '';
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.archivoSeleccionado = file;
    this.nombreArchivo = file.name;
    // Autocompletar nombre si está vacío
    if (!this.nuevoNombre) {
      this.nuevoNombre = file.name.replace(/\.[^/.]+$/, '');
    }
  }

  subirDocumento(): void {
    if (!this.nuevoNombre || !this.archivoSeleccionado) {
      this.mensajeSubida = '❌ Nombre y archivo son obligatorios';
      return;
    }

    const categoriaFinal = this.nuevaCategoriaManual.trim() || this.nuevaCategoria;
    if (!categoriaFinal) {
      this.mensajeSubida = '❌ Selecciona o escribe una categoría';
      return;
    }

    const fd = new FormData();
    fd.append('nombre',    this.nuevoNombre);
    fd.append('categoria', categoriaFinal);
    fd.append('archivo',   this.archivoSeleccionado);

    this.subiendo = true;
    this.mensajeSubida = 'Subiendo...';

    this.docService.subir(fd).subscribe({
      next: () => {
        this.subiendo = false;
        this.mensajeSubida = '✅ Documento subido correctamente';
        this.cargar();
        this.cerrarModal();
      },
      error: (err) => {
        this.subiendo = false;
        this.mensajeSubida = '❌ ' + (err?.error?.error ?? 'Error al subir');
      }
    });
  }

  // --- Eliminar ---
  confirmarEliminar(id: number, nombre: string): void {
    
  console.log('Confirmar eliminar llamado', id, nombre);
    this.docAEliminar = { id, nombre };
    this.mostrarConfirmacion = true;
  }

  ejecutarEliminar(): void {
    if (!this.docAEliminar) return;
    this.docService.eliminar(this.docAEliminar.id).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== this.docAEliminar!.id);
        this.cancelarEliminar();
      },
      error: () => alert('Error al eliminar')
    });
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacion = false;
    this.docAEliminar = null;
  }
}
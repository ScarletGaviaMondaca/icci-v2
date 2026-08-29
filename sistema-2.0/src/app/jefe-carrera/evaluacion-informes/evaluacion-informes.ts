import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoService } from '../../servicios/seguimiento.service';

@Component({
  selector: 'app-evaluacion-informes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluacion-informes.html',
  styleUrl: './evaluacion-informes.css',
})
export class EvaluacionInformes implements OnInit {
  alumnos: any[] = [];
  historial: any[] = [];
  cargando = false;
  enviando = false;
  error = '';
  mensaje = '';
  seleccionados = new Set<number>();

  mostrarModalCarta = false;
  numeroCarta = '';

  constructor(
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
    this.cargarHistorial();
  }

  cargar() {
    this.cargando = true;
    this.seg.getEvaluacionInformes().subscribe({
      next: (data) => {
        this.alumnos = data || [];
        this.seleccionados.clear();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los alumnos';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarHistorial() {
    this.seg.listarHistorialEvaluador().subscribe({
      next: (data) => {
        this.historial = data || [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  toggleSeleccion(seguimientoId: number) {
    if (this.seleccionados.has(seguimientoId)) {
      this.seleccionados.delete(seguimientoId);
    } else {
      this.seleccionados.add(seguimientoId);
    }
  }

  toggleTodos(event: any) {
    if (event.target.checked) {
      this.alumnos.forEach(a => this.seleccionados.add(a.seguimiento_id));
    } else {
      this.seleccionados.clear();
    }
  }

  get todosSeleccionados(): boolean {
    return this.alumnos.length > 0 && this.seleccionados.size === this.alumnos.length;
  }

  abrirModalCarta() {
    if (this.seleccionados.size === 0) return;
    this.numeroCarta = '';
    this.mostrarModalCarta = true;
  }

  cancelarModalCarta() {
    this.mostrarModalCarta = false;
    this.numeroCarta = '';
  }

  confirmarSolicitud() {
    const numeroCarta = this.numeroCarta.trim();
    if (!numeroCarta || this.seleccionados.size === 0) return;

    const ids = Array.from(this.seleccionados);
    this.mostrarModalCarta = false;
    this.enviando = true;
    this.error = '';

    this.seg.solicitarProfesorEvaluadorBulk(ids).subscribe({
      next: () => {
        this.seg.generarListaProfesorEvaluador(ids, numeroCarta).subscribe({
          next: (res) => {
            const blob = res.body as Blob;
            const codigo = res.headers.get('X-Verificacion-Codigo');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const numeroArchivo = numeroCarta.replace(/[^\w.-]+/g, '-');
            a.download = `Solicitud_Profesor_Evaluador_ICCI_${numeroArchivo}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            this.mensaje = `✅ Solicitud ICCI N° ${numeroCarta} enviada para ${ids.length} alumno(s)`
              + (codigo ? ` · Código de verificación: ${codigo}` : '');
            this.enviando = false;
            this.cargar();
            this.cargarHistorial();
            setTimeout(() => this.mensaje = '', 6000);
          },
          error: () => {
            this.error = '❌ La solicitud se envió, pero no se pudo generar el documento';
            this.enviando = false;
          },
        });
      },
      error: () => {
        this.error = '❌ Error al enviar la solicitud';
        this.enviando = false;
      },
    });
  }
}

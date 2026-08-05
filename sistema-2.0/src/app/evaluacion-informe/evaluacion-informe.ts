import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SeguimientoService } from '../servicios/seguimiento.service';
import { AuthService } from '../servicios/auth.service';

@Component({
  selector: 'app-evaluacion-informe',
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluacion-informe.html',
  styleUrl: './evaluacion-informe.css',
})
export class EvaluacionInforme implements OnInit {
  seguimiento: any = null;
  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';
  mostrarDetallePractica = false;

  criterios: Record<string, string> = {
    criterio1: '',
    criterio2: '',
    criterio3: '',
    criterio4: '',
    criterio5: '',
    criterio6: '',
  };
  observaciones = '';
  resultado = '';
  archivoFeedback: File | null = null;

  criterioLabels = [
    { key: 'criterio1', titulo: 'Título', texto: '¿Corresponde al trabajo realizado?' },
    { key: 'criterio2', titulo: 'Formato', texto: '¿Sigue el formato definido por la Jefatura de Carrera?' },
    { key: 'criterio3', titulo: 'Objetivos', texto: '¿Existe coherencia entre los objetivos generales, específicos y actividades realizadas?' },
    { key: 'criterio4', titulo: 'Descripción empresa', texto: '¿Existe una descripción de la empresa de acuerdo al formato entregado por la carrera?' },
    { key: 'criterio5', titulo: 'Trabajo realizado', texto: '¿El trabajo se realizó en el contexto de la empresa y en concordancia al nivel de la práctica?' },
    { key: 'criterio6', titulo: 'Experiencias', texto: '¿Se describen las experiencias personales y técnicas adquiridas?' },
  ];

  resultadoOpciones = [
    { valor: 'a', label: 'a)  El informe se aprueba sin observaciones.' },
    { valor: 'b', label: 'b)  El informe se aprueba con observaciones.' },
    { valor: 'c', label: 'c)  El informe debe ser reformulado de acuerdo a las observaciones.' },
    { valor: 'd', label: 'd)  El informe se rechaza y el alumno debe hacer una nueva práctica.' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seg: SeguimientoService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['seguimientoId'];
    if (!id) { this.error = 'ID de seguimiento no encontrado.'; this.cargando = false; return; }
    this.seg.getSeguimiento(+id).subscribe({
      next: (data) => { this.seguimiento = data; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'Error al cargar los datos del alumno.'; this.cargando = false; },
    });
  }

  get requiereObservaciones(): boolean {
    return this.resultado === 'b' || this.resultado === 'c';
  }

  get requiereArchivo(): boolean {
    return this.resultado === 'c';
  }

  get formularioValido(): boolean {
    if (!this.resultado) return false;
    if (this.requiereObservaciones && !this.observaciones.trim()) return false;
    return true;
  }

  onArchivoFeedback(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoFeedback = input.files?.[0] ?? null;
  }

  guardar() {
    if (!this.formularioValido || !this.seguimiento) return;
    this.guardando = true;
    this.error = '';

    const fd = new FormData();
    fd.append('seguimiento_id', String(this.seguimiento.id));
    Object.entries(this.criterios).forEach(([k, v]) => fd.append(k, v));
    fd.append('observaciones', this.observaciones);
    fd.append('resultado', this.resultado);
    if (this.archivoFeedback) fd.append('archivo_feedback', this.archivoFeedback);

    this.seg.evaluarInforme(fd).subscribe({
      next: () => {
        this.guardando = false;
        this.mensaje = '✅ Evaluación guardada correctamente.';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/noticias']), 2200);
      },
      error: (err) => {
        this.error = err?.error?.message ?? '❌ Error al guardar la evaluación.';
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  volver() {
    this.router.navigate(['/noticias']);
  }
}

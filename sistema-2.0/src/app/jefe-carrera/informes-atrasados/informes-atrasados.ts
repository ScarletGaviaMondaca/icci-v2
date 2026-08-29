import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoService } from '../../servicios/seguimiento.service';

@Component({
  selector: 'app-informes-atrasados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './informes-atrasados.html',
  styleUrl: './informes-atrasados.css',
})
export class InformesAtrasados implements OnInit {
  alumnos: any[] = [];
  cargando = false;
  error = '';
  mensaje = '';
  enviandoId: number | null = null;

  practicasAtrasadas: any[] = [];
  cargandoPracticas = false;
  enviandoIdPractica: number | null = null;

  constructor(
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
    this.cargarPracticasAtrasadas();
  }

  cargar() {
    this.cargando = true;
    this.seg.getInformesAtrasados().subscribe({
      next: (data) => {
        this.alumnos = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los informes atrasados';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  enviarAComite(alumno: any) {
    if (!confirm(`¿Enviar a ${alumno.nombres} ${alumno.apellido1} al comité de carrera por informe atrasado?`)) return;

    this.enviandoId = alumno.seguimiento_id;
    this.error = '';
    this.seg.enviarComiteAtrasado(alumno.seguimiento_id).subscribe({
      next: () => {
        this.alumnos = this.alumnos.filter(a => a.seguimiento_id !== alumno.seguimiento_id);
        this.mensaje = `✅ ${alumno.nombres} ${alumno.apellido1} fue enviado al comité de carrera`;
        this.enviandoId = null;
        setTimeout(() => this.mensaje = '', 4000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '❌ Error al enviar el alumno a comité';
        this.enviandoId = null;
      },
    });
  }

  cargarPracticasAtrasadas() {
    this.cargandoPracticas = true;
    this.seg.getPracticasAtrasadas().subscribe({
      next: (data) => {
        this.practicasAtrasadas = data || [];
        this.cargandoPracticas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar las prácticas atrasadas';
        this.cargandoPracticas = false;
        this.cdr.detectChanges();
      },
    });
  }

  enviarPracticaAComite(alumno: any) {
    if (!confirm(`¿Enviar a ${alumno.nombres} ${alumno.apellido1} al comité de carrera por práctica atrasada?`)) return;

    this.enviandoIdPractica = alumno.seguimiento_id;
    this.error = '';
    this.seg.enviarComitePracticaAtrasada(alumno.seguimiento_id).subscribe({
      next: () => {
        this.practicasAtrasadas = this.practicasAtrasadas.filter(a => a.seguimiento_id !== alumno.seguimiento_id);
        this.mensaje = `✅ ${alumno.nombres} ${alumno.apellido1} fue enviado al comité de carrera`;
        this.enviandoIdPractica = null;
        setTimeout(() => this.mensaje = '', 4000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = '❌ Error al enviar el alumno a comité';
        this.enviandoIdPractica = null;
      },
    });
  }
}

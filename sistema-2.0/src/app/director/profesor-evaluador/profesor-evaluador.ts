import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-profesor-evaluador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profesor-evaluador.html',
  styleUrl: './profesor-evaluador.css',
})
export class ProfesorEvaluador implements OnInit {
  alumnos: any[] = [];
  profesores: any[] = [];
  solicitudesIcci: any[] = [];
  resumenProfesores: any[] = [];
  cargando = false;
  error = '';
  mensaje = '';

  seleccionados = new Set<number>();
  enviando = false;
  guardando = false;

  mostrarModalDici = false;
  diciNumero = '';

  constructor(
    private seg: SeguimientoService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
    this.seg.getProfesores().subscribe(profArr => {
      this.profesores = profArr;
      this.cdr.detectChanges();
    });
    if (!this.auth.esSecretariaDici()) {
      this.cargarResumenProfesores();
    }
  }

  cargarResumenProfesores() {
    this.seg.getResumenProfesorEvaluador().subscribe({
      next: (data) => {
        this.resumenProfesores = data || [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  cargar() {
    this.cargando = true;

    // Secretaría DICI: ve a los alumnos ya propuestos por el director, listos
    // para generar el acta. Director (o su subrogante): ve a los pendientes de
    // asignación, con la última propuesta guardada precargada en el selector.
    const obs = this.auth.esSecretariaDici()
      ? this.seg.getListosParaActa()
      : this.seg.getPendientesAsignacionAcademico();

    obs.subscribe({
      next: (data) => {
        this.alumnos = (data || []).map(a => this.auth.esSecretariaDici()
          ? { ...a, informe_rev_profesor_id: a.profesor_propuesto_id }
          : { ...a, informe_rev_profesor_id: a.informe_rev_profesor_id ?? a.informe_rev_profesor_propuesto_id ?? null }
        );
        this.seleccionados.clear();
        this.cargando = false;
        this.cdr.detectChanges();

        if (this.auth.esSecretariaDici()) {
          this.solicitudesIcci = [];
          return;
        }

        const ids = this.alumnos.map(a => a.seguimiento_id);
        if (ids.length > 0) {
          this.seg.listarSolicitudesIcci(ids).subscribe({
            next: (sol) => { this.solicitudesIcci = sol || []; this.cdr.detectChanges(); },
            error: () => {},
          });
        } else {
          this.solicitudesIcci = [];
        }
      },
      error: () => {
        this.error = 'Error al cargar los alumnos';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleSeleccion(seguimientoId: number) {
    if (this.seleccionados.has(seguimientoId)) {
      this.seleccionados.delete(seguimientoId);
    } else {
      this.seleccionados.add(seguimientoId);
    }
  }

  get todosSeleccionados(): boolean {
    return this.alumnos.length > 0 && this.alumnos.every(a => this.seleccionados.has(a.seguimiento_id));
  }

  toggleTodos(event: any) {
    if (event.target.checked) {
      this.alumnos.forEach(a => this.seleccionados.add(a.seguimiento_id));
    } else {
      this.seleccionados.clear();
    }
  }

  // Director (o subrogante): guarda la elección de académico evaluador de cada
  // alumno como propuesta, sin oficializarla. Notifica a secretaría DICI, quien
  // recién oficializa la asignación al generar el acta.
  guardarPropuestas() {
    const asignaciones = this.alumnos
      .filter(a => a.informe_rev_profesor_id)
      .map(a => ({ seguimiento_id: a.seguimiento_id, profesor_id: a.informe_rev_profesor_id }));

    if (asignaciones.length === 0) {
      this.error = '❌ Elige al menos un profesor evaluador antes de guardar.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.seg.proponerProfesoresEvaluadores(asignaciones).subscribe({
      next: () => {
        this.mensaje = `✅ Selección guardada para ${asignaciones.length} alumno(s). Se notificó a secretaría DICI para generar el acta.`;
        this.guardando = false;
        this.cargar();
        setTimeout(() => this.mensaje = '', 6000);
      },
      error: () => {
        this.error = '❌ Error al guardar la selección';
        this.guardando = false;
      },
    });
  }

  abrirModalDici() {
    if (this.seleccionados.size === 0) return;

    const sinProfesor = this.alumnos.filter(a => this.seleccionados.has(a.seguimiento_id) && !a.informe_rev_profesor_id);
    if (sinProfesor.length > 0) {
      this.error = `❌ Elige un profesor evaluador para: ${sinProfesor.map(a => `${a.nombres} ${a.apellido1}`).join(', ')}`;
      return;
    }

    this.error = '';
    this.diciNumero = '';
    this.mostrarModalDici = true;
  }

  cancelarModalDici() {
    this.mostrarModalDici = false;
  }

  confirmarGenerarActa() {
    const diciNumero = this.diciNumero.trim();
    if (!diciNumero || this.seleccionados.size === 0) return;

    const seleccionadosAlumnos = this.alumnos.filter(a => this.seleccionados.has(a.seguimiento_id));
    const ids = seleccionadosAlumnos.map(a => a.seguimiento_id);
    this.mostrarModalDici = false;
    this.enviando = true;
    this.error = '';

    // Guarda la asignación oficial de cada alumno seleccionado y luego genera el acta con todos.
    forkJoin(
      seleccionadosAlumnos.map(a => this.seg.asignarProfesorEvaluador(a.seguimiento_id, a.informe_rev_profesor_id))
    ).subscribe({
      next: () => {
        this.seg.generarActaAcademicoEvaluador(ids, diciNumero).subscribe({
          next: (res) => {
            const blob = res.body as Blob;
            const codigo = res.headers.get('X-Verificacion-Codigo');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const numeroArchivo = diciNumero.replace(/[^\w.-]+/g, '-');
            a.download = `Acta_Academico_Evaluador_DICI_${numeroArchivo}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            this.mensaje = `✅ Acta DICI N° ${diciNumero} generada para ${ids.length} alumno(s)`
              + (codigo ? ` · Código de verificación: ${codigo}` : '');
            this.enviando = false;
            this.cargar();
            setTimeout(() => this.mensaje = '', 6000);
          },
          error: () => {
            this.error = '❌ Los profesores se asignaron, pero no se pudo generar el acta';
            this.enviando = false;
          },
        });
      },
      error: () => {
        this.error = '❌ Error al asignar los profesores evaluadores';
        this.enviando = false;
      },
    });
  }
}

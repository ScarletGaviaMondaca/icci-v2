import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-evaluacion-empresa',
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluacion-empresa.html',
  styleUrl: './evaluacion-empresa.css'
})
export class EvaluacionEmpresa implements OnInit {
  notif: any = null;
  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';

  criterios: Record<string, string> = {
    criterio_asistencia: '',
    criterio_cantidad: '',
    criterio_calidad: '',
    criterio_normativas: '',
    criterio_aprendizaje: '',
    criterio_conocimientos: '',
    criterio_habilidades: '',
    criterio_trabajo_equipo: '',
  };

  nombre_supervisor = '';
  descripcion_trabajo = '';
  comentarios = '';
  utilidad = '';

  criterioLabels = [
    {
      key: 'criterio_asistencia', num: '3.1', titulo: 'Asistencia',
      desc: '(Considerando la puntualidad que se observa en el practicante, en el cumplimiento de los horarios de la jornada laboral).',
      opciones: [
        { val: 'a', texto: 'Registro óptimo de asistencia' },
        { val: 'b', texto: 'Asistencia satisfactoria' },
        { val: 'c', texto: 'Fallas en la asistencia' },
      ],
    },
    {
      key: 'criterio_cantidad', num: '3.2', titulo: 'Cantidad de trabajo', desc: '',
      opciones: [
        { val: 'a', texto: 'Por encima del promedio' },
        { val: 'b', texto: 'Alrededor del promedio' },
        { val: 'c', texto: 'Por debajo del promedio' },
      ],
    },
    {
      key: 'criterio_calidad', num: '3.3', titulo: 'Calidad de trabajo',
      desc: '(Considérese la facilidad con que el practicante se acomoda a los cambios en la naturaleza de la tarea, así como la soltura que mostró en su adaptación inicial a la empresa).',
      opciones: [
        { val: 'a', texto: 'Mucha adaptación, cambia con más facilidad que el promedio' },
        { val: 'b', texto: 'Satisfactoria adaptabilidad, cambia con la facilidad que lo hace el promedio' },
        { val: 'c', texto: 'Adaptabilidad no satisfactoria, cambia con menos facilidad que el promedio' },
      ],
    },
    {
      key: 'criterio_normativas', num: '3.4', titulo: 'Normativas',
      desc: '(Considere el respeto a las normas, la seguridad y la influencia sobre los demás que, en estos aspectos, ejerce el practicante).',
      opciones: [
        { val: 'a', texto: 'Cumple con las normas' },
        { val: 'b', texto: 'Viola algunas veces las normas' },
      ],
    },
    {
      key: 'criterio_aprendizaje', num: '3.5', titulo: 'Capacidad y Aprendizaje',
      desc: '(Considérese la rapidez y ausencia de errores que en aprendizaje de las tareas, muestra el practicante).',
      opciones: [
        { val: 'a', texto: 'Capacidad de aprendizaje por sobre el promedio, requiere poca enseñanza' },
        { val: 'b', texto: 'Capacidad de aprendizaje de nivel medio, requiere enseñanza normal' },
        { val: 'c', texto: 'Capacidad de aprendizaje por debajo del promedio, requiere mucha enseñanza' },
      ],
    },
    {
      key: 'criterio_conocimientos', num: '3.6', titulo: 'Conocimientos',
      desc: '(Considérese la calidad, cantidad y sobre todo la actualidad de la información tecnológica que exhibe el practicante).',
      opciones: [
        { val: 'a', texto: 'Buen nivel, por sobre el promedio' },
        { val: 'b', texto: 'Nivel satisfactorio o promedio' },
        { val: 'c', texto: 'Nivel no satisfactorio, por debajo del promedio' },
      ],
    },
    {
      key: 'criterio_habilidades', num: '3.7', titulo: 'Habilidades',
      desc: '(Considérense las destrezas de tipo profesional que aporta el practicante a la ejecución de las tareas asignadas).',
      opciones: [
        { val: 'a', texto: 'Mucha habilidad, destreza por sobre el promedio' },
        { val: 'b', texto: 'Habilidad satisfactoria, destreza promedio' },
        { val: 'c', texto: 'Habilidad no satisfactoria, destreza por debajo del promedio' },
      ],
    },
    {
      key: 'criterio_trabajo_equipo', num: '3.8', titulo: 'Actitud para trabajar en Equipo',
      desc: '(Considérese la conducta cooperativa hacia los supervisores y otro personal, que manifiesta el practicante).',
      opciones: [
        { val: 'a', texto: 'Coopera voluntariamente y se ofrece a ayudar a los demás' },
        { val: 'b', texto: 'Generalmente cooperativo' },
        { val: 'c', texto: 'Trabaja mal con los demás' },
      ],
    },
  ];

  constructor(
    private seg: SeguimientoService,
    public auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const state = history.state;
    if (state?.notif) {
      this.notif = state.notif;
      this.nombre_supervisor = this.notif.practica1_supervisor ?? '';
      this.cargando = false;
    } else {
      this.error = 'No se encontraron datos de evaluación.';
      this.cargando = false;
    }
  }

  get formularioValido(): boolean {
    return Object.values(this.criterios).every(v => v !== '');
  }

  guardar() {
    if (!this.formularioValido || !this.notif) return;
    this.guardando = true;
    this.error = '';

    const payload = {
      seguimiento_id: this.notif.seguimiento_id,
      nombre_supervisor: this.nombre_supervisor,
      ...this.criterios,
      descripcion_trabajo: this.descripcion_trabajo,
      comentarios: this.comentarios,
      utilidad: this.utilidad,
    };

    this.seg.evaluarEmpresa(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.mensaje = '✅ Evaluación guardada correctamente.';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/empleador']), 2200);
      },
      error: (err) => {
        this.error = err?.error?.message ?? '❌ Error al guardar la evaluación.';
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  volver() {
    this.router.navigate(['/empleador']);
  }
}

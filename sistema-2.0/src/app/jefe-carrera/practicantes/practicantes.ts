import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


const HITO_LABELS: Record<string, string> = {
  practica1_estado:      'Estudiante en Práctica',
  informe_elab_estado:   'Elaboración del Informe',
  informe_rev_estado:    'Revisión del Informe',
  eval_empresa_estado:   'Evaluación Empresa',
  comite_carrera_estado: 'Comité de Carrera',
  envioreg_estado:       'Envío a Registraduría',
};

@Component({
  selector: 'app-practicantes',
  imports: [CommonModule, FormsModule],
  templateUrl: './practicantes.html',
  styleUrl: './practicantes.css',
})
export class Practicantes implements OnInit {
   alumnos: any[] = [];
  cargando = false;
  error = '';

  filtroPractica: '' | 1 | 2 = '';
  filtroNombre = '';
  filtroApellido = '';
  filtroRut = '';

  constructor(
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.seg.getEnCurso().subscribe({
      next: (data) => {
        this.alumnos = (data || []).map(a => ({
          ...a,
          apellidos: `${a.apellido1 ?? ''} ${a.apellido2 ?? ''}`.trim(),
          hito_label: HITO_LABELS[a.hito_actual] ?? a.hito_actual,
        }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los alumnos en práctica';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get alumnosFiltrados(): any[] {
    const nombre = this.filtroNombre.trim().toLowerCase();
    const apellido = this.filtroApellido.trim().toLowerCase();
    const rut = this.filtroRut.trim().toLowerCase();

    return this.alumnos.filter(a => {
      if (this.filtroPractica && Number(a.practica_num) !== Number(this.filtroPractica)) return false;
      if (nombre && !String(a.nombres ?? '').toLowerCase().includes(nombre)) return false;
      if (apellido && !String(a.apellidos ?? '').toLowerCase().includes(apellido)) return false;
      if (rut && !String(a.rut ?? '').toLowerCase().includes(rut)) return false;
      return true;
    });
  }
}

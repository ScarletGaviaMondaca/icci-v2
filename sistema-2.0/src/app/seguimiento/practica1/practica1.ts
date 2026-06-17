
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';

/** Estados de hitos */
export type Estado = 0 | 1 | 2 | 3;
export type FiltroEstado = '' | Estado;

/** Estructura tipo para un alumno mostrado en la tabla */
export interface AlumnoSeguimiento {
  id: number;
  rut: string;
  nombres: string;
  apellido1: string;
  apellido2: string;
  plan: string;
  practica_num: number;
  practica1_estado: Estado;
  informe_elab_estado: Estado;
  informe_rev_estado: Estado;
  eval_empresa_estado: Estado;
  comite_carrera_estado: Estado;
  envioreg_estado: Estado;
}

/** Claves para hitos de seguimiento */
export type EtapaKey =
  | 'practica1_estado'
  | 'informe_elab_estado'
  | 'informe_rev_estado'
  | 'eval_empresa_estado'
  | 'comite_carrera_estado'
  | 'envioreg_estado';

@Component({
  selector: 'app-practica1',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './practica1.html',
  styleUrls: ['./practica1.css'],
})
export class Practica1 implements OnInit {
  private seg = inject(SeguimientoService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  public auth = inject(AuthService);

  // ------------------------
  // Datos
  // ------------------------
  alumnos: AlumnoSeguimiento[] = [];
  planes: string[] = [];
  paginaActual = 1;
  elementosPorPagina = 10;
  filtroRut = '';
  filtroNombre = '';
  planSeleccionado = '';
  practicaNum: number = 1; // 1 o 2
estadosSeguimiento = [
  { value: 0, label: '⚪ No iniciado' },
  { value: 1, label: '🟡 Pendiente / En curso' },
  { value: 2, label: '🟢 Aprobado / Completado' },
  { value: 3, label: '🔴 Reprobado / Excedido' }
];
  readonly ETAPAS: EtapaKey[] = [
    'practica1_estado',
    'informe_elab_estado',
    'informe_rev_estado',
    'eval_empresa_estado',
    'comite_carrera_estado',
    'envioreg_estado',
  ];
  mostrarCarga = false;
  nombreArchivo = '';
  estadoSubida = '';
  tipoExport: 'csv' | 'excel' | 'pdf' = 'csv';
  filtroPlan: string = '';
  filtroPractica1: '' | 0 | 1 | 2 | 3 = '';
  filtroInformeElab: '' | 0 | 1 | 2 | 3 = '';
  filtroInformeRev: '' | 0 | 1 | 2 | 3 = '';
  filtroEvalEmpresa: '' | 0 | 1 | 2 | 3 = '';
  filtroComiteCarrera: '' | 0 | 1 | 2 | 3 = '';
  filtroEnvioreg: '' | 0 | 1 | 2 | 3 = '';
 
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      setTimeout(() => {
        const num = Number(params.get('num'));
        this.practicaNum = num === 2 ? 2 : 1;
        this.cargar();
        this.cdr.detectChanges();
      }, 0);
    });
  }
  cargar(): void {
    this.seg.listar(this.practicaNum).subscribe({
      next: (data: any[]) => {
        // Aplanar datos — mover alumno.xxx al nivel raíz
        this.alumnos = (data || []).map(item => ({
          ...item,
          rut: item.alumno?.rut ?? item.rut,
          nombres: item.alumno?.nombres ?? item.nombres,
          apellido1: item.alumno?.apellido1 ?? item.apellido1,
          apellido2: item.alumno?.apellido2 ?? item.apellido2,
        }));
        this.planes = Array.from(
          new Set(this.alumnos.map(x => String(x.plan ?? '')).filter(Boolean))
        ).sort();
        this.paginaActual = 1;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar alumnos:', err)
    });
  }
  tieneAvance(a: AlumnoSeguimiento): boolean {
    return this.ETAPAS.some(key => a[key] !== 0);
  }

  alumnosFiltrados(): AlumnoSeguimiento[] {
    const rut = this.filtroRut.toLowerCase().trim();
    const nombre = this.filtroNombre.toLowerCase().trim();
    const planSel = String(this.filtroPlan ?? '').trim();

    return this.alumnos.filter(a => {
      if (Number(a.practica_num) !== this.practicaNum) return false;
      if (rut && !String(a.rut ?? '').toLowerCase().includes(rut)) return false;
      if (nombre) {
        const full = `${a.nombres ?? ''} ${a.apellido1 ?? ''} ${a.apellido2 ?? ''}`.toLowerCase();
        if (!full.includes(nombre)) return false;
      }
      if (planSel && String(a.plan ?? '') !== planSel) return false;
      if (this.filtroPractica1 !== '' && Number(a.practica1_estado) !== Number(this.filtroPractica1)) return false;
      if (this.filtroInformeElab !== '' && Number(a.informe_elab_estado) !== Number(this.filtroInformeElab)) return false;
      if (this.filtroInformeRev !== '' && Number(a.informe_rev_estado) !== Number(this.filtroInformeRev)) return false;
      if (this.filtroEvalEmpresa !== '' && Number(a.eval_empresa_estado) !== Number(this.filtroEvalEmpresa)) return false;
      if (this.filtroComiteCarrera !== '' && Number(a.comite_carrera_estado) !== Number(this.filtroComiteCarrera)) return false;
      if (this.filtroEnvioreg !== '' && Number(a.envioreg_estado) !== Number(this.filtroEnvioreg)) return false;

      // Solo muestra alumnos con al menos un avance (opcional)
      return true;
    });
  }

  alumnosPaginados(): AlumnoSeguimiento[] {
    const lista = this.alumnosFiltrados();
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    return lista.slice(inicio, inicio + this.elementosPorPagina);
  }
  numeroFila(index: number): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + index + 1;
  }

  totalPaginas(): number {
    const total = this.alumnosFiltrados().length;
    return Math.max(1, Math.ceil(total / this.elementosPorPagina));
  }

  cambiarPagina(p: number): void {
    const max = this.totalPaginas();
    if (p < 1) p = 1;
    if (p > max) p = max;
    this.paginaActual = p;
  }
  paginasArray(): number[] {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }
  trackByPagina(index: number, p: number): number {
    return p;
  }
  trackById(index: number, item: AlumnoSeguimiento): number {
    return item.id;
  }
  toggleCarga(): void {
    this.mostrarCarga = !this.mostrarCarga;
  }
  importarCSV(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.nombreArchivo = file.name;
    this.estadoSubida = 'Importando...';

    this.seg.importarCSV(file,this.practicaNum).subscribe({
      next: (resp: any) => {
        const imp = resp?.importados ?? 0;
        const omi = resp?.omitidos ?? 0;
        const noex = resp?.no_existen_en_bd ?? 0;
        this.estadoSubida = `Importados: ${imp} | Omitidos: ${omi} | No existen: ${noex}`;
        this.mostrarCarga = false;
        this.cargar();
      },
      error: (err: any) => {
        console.error('ERROR IMPORT', err);
        alert('Error al importar:\n' + (err.error ? JSON.stringify(err.error, null, 2) : err.message));
        this.estadoSubida = 'Error al importar (revisa consola)';
      }
    });

    input.value = '';
  }
  private descargarBlob(blob: Blob, nombre: string) {
    const url = window.URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportar(): void {
    const ext = this.tipoExport === 'excel' ? 'xlsx' : 'csv';
    this.seg.exportar(this.tipoExport, {
      rut:         this.filtroRut,
      nombre:      this.filtroNombre,
      plan:        this.filtroPlan,
      practicaNum: this.practicaNum,
    }).subscribe({
      next: (blob: any) => this.descargarBlob(blob, `seguimiento_p${this.practicaNum}_filtrado.${ext}`),
      error: (err: any) => { console.error(err); alert('No se pudo exportar'); },
    });
  }

  exportarTodo(): void {
    const ext = this.tipoExport === 'excel' ? 'xlsx' : 'csv';
    this.seg.exportar(this.tipoExport, { practicaNum: this.practicaNum }).subscribe({
      next: (blob: any) => this.descargarBlob(blob, `seguimiento_p${this.practicaNum}_completo.${ext}`),
      error: (err: any) => { console.error(err); alert('No se pudo exportar'); },
    });
  }
  descargarPlantilla(tipo: 'csv' | 'excel'): void {
    console.log('Descargar plantilla:', tipo);
  }
}
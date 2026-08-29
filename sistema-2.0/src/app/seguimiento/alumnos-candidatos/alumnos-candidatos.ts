import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { AlumnoService } from '../../servicios/alumno.service';
import { AuthService } from '../../servicios/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RutFormatoPipe } from '../../pipes/rut-formato.pipe';

@Component({
  selector: 'app-alumnos-candidatos',
  imports: [RouterLink, CommonModule, FormsModule, RutFormatoPipe],
  templateUrl: './alumnos-candidatos.html',
  styleUrl: './alumnos-candidatos.css',
})
export class AlumnosCandidatos implements OnInit{
  alumnos: any[] = [];

  filtroRut = '';
  filtroNombre = '';
  filtroApellidos = '';
  filtroPlan = '';
  filtroAnio = '';
  filtroPractica1 = false;
  filtroPractica2 = false;
  paginaActual = 1;
  elementosPorPagina = 20;
  soloEspeciales = false;

  // Carga de alumnos por CSV
  mostrarCarga = false;
  nombreArchivo = '';
  estadoSubida = '';
  subiendo = false;

  constructor(
    private seguimientoService: SeguimientoService,
    private alumnoService: AlumnoService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

 ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.seguimientoService.getCandidatos().subscribe({
      next: data => {
        this.alumnos = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: err => console.error('❌ Error:', err)
    });
  }

  toggleCarga() {
    this.mostrarCarga = !this.mostrarCarga;
  }

  descargarPlantilla() {
    this.alumnoService.descargarPlantilla().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_alumnos.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('No se pudo descargar la plantilla'),
    });
  }

  importarCSV(event: any) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    if (!archivo.name.endsWith('.csv')) {
      alert('Solo se permiten archivos CSV');
      event.target.value = '';
      return;
    }
    this.nombreArchivo = archivo.name;
    this.estadoSubida = 'Subiendo archivo...';
    this.subiendo = true;

    const formData = new FormData();
    formData.append('archivo_csv', archivo);

    this.alumnoService.importarCSV(formData).subscribe({
      next: (res: any) => {
        this.subiendo = false;

        if (res.estado === 'error') {
          this.estadoSubida = '❌ ' + res.mensaje;
          if (res.faltantes) {
            this.estadoSubida += ' | Faltan: ' + res.faltantes.join(', ');
          }
          return;
        }

        if (res.estado === 'ok') {
          this.estadoSubida =
            `✅ ${res.mensaje} | Importados: ${res.insertados} | Duplicados: ${res.duplicados} | Actualizados: ${res.actualizados}`;
          if (res.errores && res.errores.length > 0) {
            console.warn('Errores en filas:', res.errores);
          }
          setTimeout(() => this.estadoSubida = '', 5000);
          this.cargar();
          this.cdr.detectChanges();
          this.mostrarCarga = false;
        }
      },
      error: (err) => {
        this.subiendo = false;
        console.error('ERROR COMPLETO:', err);
        this.estadoSubida = '❌ ' + (err?.error?.mensaje ?? 'Error al conectar con el servidor');
      }
    });
  }

  puedePractica1(alumno: any): boolean {
    // puede p1 si aún no tiene práctica 1 aprobada
    return alumno.practica1_estado !== 2;
  }

  puedePractica2(alumno: any): boolean {
    return Number(alumno.envioreg_estado) === 2;
  }
 /* acciones de los botones laterales  */
  verAlumno(alumno: any) {
    this.router.navigate(['/lista-alumnos/ver-alumno', alumno.id]);
  }
  filtrarDatos() {
    return this.alumnos.filter(d =>
      (d.rut ?? '').toLowerCase().includes(this.filtroRut.toLowerCase()) &&
      (d.nombre ?? '').toLowerCase().includes(this.filtroNombre.toLowerCase()) &&
      (d.apellidos ?? '').toLowerCase().includes(this.filtroApellidos.toLowerCase()) &&
      (!this.filtroPractica1 || this.puedePractica1(d)) &&
      (!this.filtroPractica2 || this.puedePractica2(d)) &&
      (!this.soloEspeciales || d.tipo === 'especial')
    );
  }
  trackById(index: number, item: any) {
    return item.id;
  }

  alumnosPaginados() {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.filtrarDatos().slice(inicio, fin);
  }

  iniciarPractica(alumno: any, practicaNum: number) {
    console.log('iniciando practica:', alumno.id, alumno.plan, practicaNum); // 👈
      const plan = alumno.plan 
      ? String(alumno.plan) 
      : (alumno.plan_texto ?? '0');
    this.seguimientoService.updateCampo({
      alumno_id: alumno.id,
      plan: plan,
      practica_num: practicaNum,
      campo: 'practica1_estado',
      valor: 1
    }).subscribe({
      next: (res) => {
        console.log('✅ respuesta:', res); // 👈
        this.router.navigate(['/seguimiento', 'avance', alumno.id, practicaNum]);
      },
      error: (err) => {
        console.error('❌ error:', err); // 👈
        this.router.navigate(['/seguimiento', 'avance', alumno.id, practicaNum]);
      }
    });
  }

 totalPaginas(): number {
    const total = this.filtrarDatos().length;
    return Math.max(1, Math.ceil(total / this.elementosPorPagina));
  }
  numeroFila(index: number): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + index + 1;
  }

  cambiarPagina(p: number) {
    const max = this.totalPaginas();
    if (p < 1) p = 1;
    if (p > max) p = max;
    this.paginaActual = p;
  }

  paginasArray(): number[] {
    // simple: muestra todas las páginas
    // si tienes miles de alumnos, luego lo ajustamos para que muestre solo un rango (ej: 1..5)
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }
   trackByPagina(index: number, p: number) {
    return p;
  }

}

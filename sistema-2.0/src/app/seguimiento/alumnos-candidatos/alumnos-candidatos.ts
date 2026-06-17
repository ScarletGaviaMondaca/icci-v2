import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-alumnos-candidatos',
  imports: [RouterLink, CommonModule, FormsModule],
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

  constructor(
    private seguimientoService: SeguimientoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

 ngOnInit() {
    this.seguimientoService.getCandidatos().subscribe({
      next: data => {
        this.alumnos = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: err => console.error('❌ Error:', err)
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
    this.router.navigate(['/jefe/ver-alumno', alumno.id]);
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

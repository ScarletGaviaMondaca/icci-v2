import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlumnoService } from '../../../../servicios/alumno.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../servicios/auth.service';
import { RutFormatoPipe } from '../../../../pipes/rut-formato.pipe';

@Component({
  selector: 'app-lista-alumnos',
  imports: [CommonModule, FormsModule, RutFormatoPipe],
  templateUrl: './lista-alumnos.html',
  styleUrl: './lista-alumnos.css',
})
export class ListaAlumnos {

    
  alumnos: any[] = [];
  private alumnoService = inject(AlumnoService);
  private cdr = inject(ChangeDetectorRef);

  filtroRut = '';
  filtroNombre = '';
  filtroApellidos = '';
  filtroPlan = '';
  filtroAnio = '';

  tipoExport = 'csv';
  paginaActual = 1;
  elementosPorPagina = 20;

  planes: string[] = [];
  planSeleccionado: string = '';
  mostrarConfirmacion = false;
  alumnoAEliminar:{ id: number, nombre: string } | null = null;

  mostrarCarga = false;
  nombreArchivo = '';
  estadoSubida = '';
  subiendo = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    public auth: AuthService
  ) {}
  ngOnInit(): void {
    this.recargarTabla();
  }
  recargarTabla() {
    this.alumnoService.getAlumnos().subscribe({
      next: (datos) => {
        this.alumnos = datos;
        this.generarPlanes();
        const max = this.totalPaginas();
        if (this.paginaActual > max) this.paginaActual = max;
        this.cdr.detectChanges();
      },
    error: (err) => console.error('Error al cargar alumnos:', err)  
    });
  }
  generarPlanes() {
    const lista = this.alumnos.map(a => a.plan);
    this.planes = [...new Set(lista)].sort();
  }
  //normaliza texto para comparaciones, eliminando acentos y convirtiendo a minúsculas
  private normalizar(texto: string): string {
    return (texto ?? '')
      .toLowerCase()
      .normalize('NFD')                    // descompone á → a + ́
      .replace(/[\u0300-\u036f]/g, '');    // elimina los diacríticos
  }
  filtrarDatos() {
    const rut       = this.normalizar(this.filtroRut);
    const nombre    = this.normalizar(this.filtroNombre);
    const apellidos = this.normalizar(this.filtroApellidos);
    const anio      = this.normalizar(this.filtroAnio);

    return this.alumnos.filter(d =>
      this.normalizar(d.rut).includes(rut) &&
      this.normalizar(d.nombres).includes(nombre) &&
      this.normalizar(`${d.apellido1 ?? ''} ${d.apellido2 ?? ''}`).includes(apellidos) &&
      (this.planSeleccionado === '' || String(d.plan) === String(this.planSeleccionado))&&
      this.normalizar(String(d.anio_ingreso ?? '')).includes(anio)
    );
  }
  trackById(index: number, item: any) {
    return item.id;
  }
  private descargarBlob(blob: Blob, nombre: string) {
    const url = window.URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportar() {
    this.alumnoService.exportar({
      rut:       this.filtroRut,
      nombre:    this.filtroNombre,
      apellidos: this.filtroApellidos,
      plan:      this.planSeleccionado,
      anio:      this.filtroAnio,
    }).subscribe({
      next: (blob: any) => this.descargarBlob(blob, 'alumnos_filtrados.csv'),
      error: (err: any) => { console.error(err); alert('No se pudo exportar'); },
    });
  }

  exportarTodo() {
    this.alumnoService.exportarTodo().subscribe({
      next: (blob: any) => this.descargarBlob(blob, 'alumnos_completo.csv'),
      error: (err: any) => { console.error(err); alert('No se pudo exportar'); },
    });
  }

  toggleCarga() {
    this.mostrarCarga = !this.mostrarCarga;
  }

  descargarPlantilla() {
    this.alumnoService.descargarPlantilla().subscribe({
      next: (blob: Blob) => this.descargarBlob(blob, 'plantilla_alumnos.csv'),
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
          this.recargarTabla();
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

  /* acciones de los botones laterales  */
  verAlumno(alumno: any) {
    this.router.navigate(['/lista-alumnos/ver-alumno', alumno.id]);
  }
  crearAlumno() {
    this.router.navigate(['/lista-alumnos/crear-alumno']);
  }
  editarAlumno(alumno: any) {
    this.router.navigate(['/lista-alumnos/editar-alumno', alumno.id]);
  }
  eliminarAlumno(id: number, nombre: string) {
    this.alumnoAEliminar = { id, nombre };
    this.mostrarConfirmacion = true;
    this.cdr.detectChanges();
  }
  confirmarEliminar() {
    if (this.alumnoAEliminar === null) return;

    this.alumnoService.eliminarAlumno(this.alumnoAEliminar.id).subscribe({
      next: () => {
        this.alumnos = this.alumnos.filter(a => a.id !== this.alumnoAEliminar!.id);
        this.cdr.detectChanges();
        this.cancelarEliminar();
      },
      error: () => {
        alert("Error al eliminar alumno");
        this.cancelarEliminar();
      }
    });
  }
  cancelarEliminar() {
    this.mostrarConfirmacion = false;
    this.alumnoAEliminar = null;
    this.cdr.detectChanges();
  }
  alumnosPaginados() {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.filtrarDatos().slice(inicio, fin);
  }
  numeroFila(index: number): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + index + 1;
  }
  totalPaginas(): number {
    const total = this.filtrarDatos().length;
    return Math.max(1, Math.ceil(total / this.elementosPorPagina));
  }
  cambiarPagina(p: number) {
    const max = this.totalPaginas();
    if (p < 1) p = 1;
    if (p > max) p = max;
    this.paginaActual = p;
  }
  paginasArray(): number[] {
    const total = this.totalPaginas();
    const actual = this.paginaActual;
    const rango = 2;  // cantidad de páginas hacia cada lado. Cambia según prefieras.
    let paginas: number[] = [];

    if (total <= 7) {
      // Si son pocas páginas, muestra todas
      for (let i = 1; i <= total; i++) paginas.push(i);
    } else {
      // Siempre muestra la primera y la última
      paginas = [1];

      // “...” después del 1
      if (actual > rango + 2) paginas.push(-1);

      // Rango alrededor de la actual
      let desde = Math.max(2, actual - rango);
      let hasta = Math.min(total - 1, actual + rango);

      for (let i = desde; i <= hasta; i++) paginas.push(i);

      // “...” antes del último
      if (actual < total - rango - 1) paginas.push(-2);

      // Siempre muestra el último
      paginas.push(total);
    }

    return paginas;
  }
  trackByPagina(index: number, p: number) {
    return p;
  }
  get totalFiltrados(): number {
    return this.filtrarDatos().length;
  }
  get desdeRegistro(): number {
    if (this.totalFiltrados === 0) return 0;
    return (this.paginaActual - 1) * this.elementosPorPagina + 1;
  }
  get hastaRegistro(): number {
    if (this.totalFiltrados === 0) return 0;
    const hasta = this.paginaActual * this.elementosPorPagina;
    return hasta > this.totalFiltrados ? this.totalFiltrados : hasta;
  }
}

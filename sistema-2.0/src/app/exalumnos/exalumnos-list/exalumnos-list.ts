import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ExalumnosService } from '../../servicios/exalumnos.service';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';
import { FormsModule } from '@angular/forms';
import { RutFormatoPipe } from '../../pipes/rut-formato.pipe';

@Component({
  selector: 'app-exalumnos-list',
  imports: [CommonModule, FormsModule, RutFormatoPipe],
  templateUrl: './exalumnos-list.html',
  styleUrl: './exalumnos-list.css',
})
export class ExalumnosList implements OnInit {

  exalumnos: any[] = [];
  paginaActual = 1;
  elementosPorPagina = 20;
  filtroRut = '';
  filtroNombre = '';
  filtroApellidos = '';
  filtroAnio = '';  
  filtroAnioTitulacion = '';
  tipoExport:'csv'|'excel'|'pdf'='excel';


  constructor(
    private http: HttpClient,
    private exalumnosService: ExalumnosService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.exalumnosService.getExalumnos().subscribe(data => {
      this.exalumnos = data;
      this.cdr.detectChanges();
    });
  }

  importar(event: any) {
    const file = event.target.files[0];

    this.exalumnosService.importarCSV(file)
      .subscribe(() => {
        alert('Importado!');
        this.cargar();
      });
    }
      mostrarCarga: boolean = false;

  toggleCarga() {
    this.mostrarCarga = !this.mostrarCarga;
  }
  filtrarDatos() {
    return this.exalumnos.filter(d =>
    (d.rut ?? '').toLowerCase().includes(this.filtroRut.toLowerCase())&&
    (d.nombres ?? '').toLowerCase().includes(this.filtroNombre.toLowerCase())&&
    (`${d.paterno ?? ''} ${d.materno ?? ''}`).toLowerCase().includes(this.filtroApellidos.toLowerCase())&&
    (d.anio_ingreso + '').includes(this.filtroAnio)&&
    (d.anio_titulacion + '').includes(this.filtroAnioTitulacion)
    );
  }
  get totalFiltrados(): number {
    return this.filtrarDatos().length;
  }

  get desdeRegistro(): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + 1;
  }

  get hastaRegistro(): number {
    return Math.min(
      this.paginaActual * this.elementosPorPagina,
      this.totalFiltrados
    );
  }

  trackByPagina(index: number, item: number): number {
    return item;
  }
  get datosPaginados() {
    const datos = this.filtrarDatos();
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    return datos.slice(inicio, inicio + this.elementosPorPagina);
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
  numeroFila(index: number): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + index + 1;
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
  verAlumno(ex: any) {
    this.router.navigate(['/exalumnos/perfil/', ex.id]);
  }
  editarAlumno(ex: any) {
    this.router.navigate(['/exalumnos/editar/', ex.id]);
  }
  eliminarAlumno(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este alumno?')) return;

    this.exalumnosService.eliminarExalumno(id)
      .subscribe(() => {
        alert('Eliminado correctamente');
        this.cargar();
      });
  }

  exportar(){
    const filtros = {
    rut:this.filtroRut,
    nombre:this.filtroNombre,
    apellidos:this.filtroApellidos,
    anio:this.filtroAnio,
    anio_titulacion:this.filtroAnioTitulacion
    };
    this.exalumnosService.exportarArchivo(
    this.tipoExport,
    filtros
    ).subscribe({
    next:(archivo:Blob)=>{
    const blob = new Blob([archivo]);
    const url=window.URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    let ext='csv';
    if(this.tipoExport==='excel'){
    ext='xlsx';
    }
    if(this.tipoExport==='pdf'){
    ext='pdf';
    }
    a.download=`exalumnos.${ext}`;
    a.click();
    window.URL.revokeObjectURL(url);
    },
    error:(e)=>{
    console.error(e);
    alert('Error al exportar');
    }
    });
  }
}

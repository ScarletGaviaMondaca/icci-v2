import { ChangeDetectorRef, Component, inject, Input, OnChanges, OnInit} from '@angular/core';
import { AlumnoService } from '../../../../servicios/alumno.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


type AlumnoRow = {
  id: number;
  rut: string;
  nombres: string;
  apellido1: string;
  apellido2: string | null;
  anio_ingreso: number | null;
  plan: number;
};

@Component({
  selector: 'app-alumnos-asociados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumnos-asociados.html',
  styleUrls: ['./alumnos-asociados.css'],
})

export class AlumnosAsociados implements OnChanges, OnInit {
  
  @Input() planId: number | null = null;

  cargando = false;
  error = '';
  alumnos: AlumnoRow[] = [];
  
  filtroRut = '';
  filtroNombre = '';
  filtroApellidos = '';
  filtroAnio = '';
  paginaActual = 1;
  elementosPorPagina = 20;
  plan:any = null;
  contexto: string = 'carrera';

  constructor(
    private alumnoService: AlumnoService, 
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef ) {}
    
  ngOnInit(): void {
    this.contexto = this.route.snapshot.data['contexto'] ?? 'carrera';
    if (this.planId == null) {
      this.route.paramMap.subscribe(params => {
        const pid = params.get('id') || params.get('planId');
        if (pid) {
          this.planId = Number(pid);
          this.cargar();
        } else {
          this.error = 'No se encontró el ID del plan en la ruta.';
        }
      });
    } else {
      this.cargar();
    }
  }

  ngOnChanges(): void {
    if (this.planId != null){
       this.cargar();
      console.log("ngOnChanges detectó cambio. Nuevo planId:", this.planId);
    }
  }
  

cargar() {
    if (!this.planId) return;
    this.cargando = true;
    this.error = '';

    this.alumnoService.getAlumnosPorPlan(this.planId).subscribe({
      next: (rows: AlumnoRow[]) => {
        this.alumnos = rows ?? [];
        this.cargando = false;
        this.cdr.detectChanges(); 
      },
      error: (e: any) => {
        this.error = 'No se pudieron cargar los alumnos del plan.';
        this.cargando = false;
        this.cdr.detectChanges();
        console.error(e);
      }
    });
  }

  verAlumno(a: AlumnoRow) {
    this.router.navigate(['/jefe/listado-alumnos/ver-alumno', a.id]);
  }
  
  filtrarDatos() {
    return this.alumnos.filter(d =>
      (d.rut ?? '').toLowerCase().includes(this.filtroRut.toLowerCase()) &&
      (d.nombres ?? '').toLowerCase().includes(this.filtroNombre.toLowerCase()) &&
      (`${d.apellido1 ?? ''} ${d.apellido2 ?? ''}`)
        .toLowerCase()
        .includes(this.filtroApellidos.toLowerCase()) &&
      String(d.anio_ingreso ?? '').toLowerCase().includes(this.filtroAnio.toLowerCase())
    );
  }
 
    alumnosPaginados() {
      const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
      const fin = inicio + this.elementosPorPagina;
      return this.filtrarDatos().slice(inicio, fin);
    }

    totalPaginas() {
      return Math.max(1, Math.ceil(this.filtrarDatos().length / this.elementosPorPagina));
    }
}

